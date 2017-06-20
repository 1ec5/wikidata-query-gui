var wikibase = wikibase || {};
wikibase.queryService = wikibase.queryService || {};
wikibase.queryService.ui = wikibase.queryService.ui || {};
wikibase.queryService.ui.queryHelper = wikibase.queryService.ui.queryHelper || {};

wikibase.queryService.ui.queryHelper.QueryHelper = ( function( $, wikibase ) {
	'use strict';

	var FILTER_PREDICATES = {
			'http://www.w3.org/2000/01/rdf-schema#label': true,
			'http://schema.org/description': true,
			'http://www.bigdata.com/queryHints#optimizer': true,
			'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': true
		},
		I18N_PREFIX = 'wdqs-ve-',
		TABLE_OPTIONS = {
			formatNoMatches: function () {
			}
		};

	/**
	 * A visual SPARQL editor for the Wikibase query service
	 *
	 * @class wikibase.queryService.ui.queryHelper.QueryHelper
	 * @license GNU GPL v2+
	 *
	 * @author Jonas Kress
	 * @constructor
	 * @param {wikibase.queryService.api.Wikibase} [api]
	 * @param {wikibase.queryService.api.Sparql} [sparqlApi]
	 * @param {wikibase.queryService.ui.queryHelper.SelectorBox} [selectorBox]
	 */
	function SELF( api, sparqlApi, selectorBox ) {
		this._api = api || new wikibase.queryService.api.Wikibase();
		this._selectorBox = selectorBox
			|| new wikibase.queryService.ui.queryHelper.SelectorBox( this._api, sparqlApi );
		this._query = new wikibase.queryService.ui.queryHelper.SparqlQuery();
	}

	/**
	 * @property {wikibase.queryService.api.Wikibase}
	 * @private
	 */
	SELF.prototype._api = null;

	/**
	 * @property {wikibase.queryService.ui.queryHelper.SelectorBox}
	 * @private
	 */
	SELF.prototype._selectorBox = null;

	/**
	 * @property {Function}
	 * @private
	 */
	SELF.prototype._changeListener = null;

	/**
	 * @property {wikibase.queryService.ui.queryHelper.SparqlQuery}
	 * @private
	 */
	SELF.prototype._query = null;

	/**
	 * @property {Object}
	 * @private
	 */
	SELF.prototype._triples = [];

	/**
	 * @property {Object}
	 * @private
	 */
	SELF.prototype._isSimpleMode = false;

	/**
	 * @property {Object}
	 * @private
	 */
	SELF.prototype._labels = {
		filter: 'Filter',
		show: 'Show',
		anything: 'anything',
		'with': 'with',
		any: 'any',
		or: 'or',
		subtype: 'subtype'
	};

	/**
	 * Set the SPARQL query string
	 *
	 * @param {string} query SPARQL query string
	 */
	SELF.prototype.setQuery = function( query ) {
		var prefixes = wikibase.queryService.RdfNamespaces.ALL_PREFIXES;
		this._query.parse( query, prefixes );

		this._selectorBox.setQuery( this._query );
	};

	/**
	 * Get the SPARQL query string
	 *
	 * @return {string|null}
	 */
	SELF.prototype.getQuery = function() {
		try {
			var q = this._query.getQueryString();
			q = this._cleanQueryPrefixes( q ).trim();
			return q.trim();
		} catch ( e ) {
			return null;
		}
	};

	/**
	 * Workaround for https://phabricator.wikimedia.org/T133316
	 *
	 * @private
	 */
	SELF.prototype._cleanQueryPrefixes = function( query ) {
		var prefixRegex = /PREFIX ([a-z]+): <(.*)>/gi,
			m,
			prefixes = {},
			cleanQuery = query.replace( prefixRegex, '' ).replace( /\n+/g, '\n' );

		while ( ( m = prefixRegex.exec( query ) ) ) {
			var prefix = m[1];
			var uri = m[2].replace( /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&' );

			var newQuery = cleanQuery.replace( new RegExp( '<' + uri + '([^/>#]+?)>', 'gi' ),
					prefix + ':$1' );

			if ( cleanQuery !== newQuery ) {
				cleanQuery = newQuery;
				if ( !wikibase.queryService.RdfNamespaces.STANDARD_PREFIXES[prefix] ) {
					prefixes[m[0]] = true;
				}
			}
		}

		cleanQuery = Object.keys( prefixes ).join( '\n' ) + '\n\n' + cleanQuery.trim();
		return cleanQuery;
	};

	/**
	 * Draw visual editor to given element
	 *
	 * @param {jQuery} $element
	 */
	SELF.prototype.draw = function( $element ) {
		var template = wikibase.queryService.ui.queryHelper.QueryTemplate.parse( this._query ),
			self = this,
			bindings = this._query.getBindings();

		if ( template !== null ) {
			try {
				return $element.html( template.getHtml(
					function( variable ) {
						return self._getLabel( bindings[ variable ].expression );
					},
					this._selectorBox,
					function( variable, oldId, newId ) {
						bindings[ variable ].expression = bindings[ variable ].expression
							.replace( new RegExp( oldId + '$' ), '' )
							+ newId;
						if ( self._changeListener ) {
							self._changeListener( self );
						}
					}
				) );
			} catch ( e ) {
				window.console.error( e );
			}
		}

		this._triples = this._query.getTriples();

		var subqueries = this._query.getSubQueries();
		while ( subqueries.length > 0 ) {
			var q = subqueries.pop();
			this._triples = this._triples.concat( q.getTriples() );
			subqueries.concat( q.getSubQueries() );
		}

		this._isSimpleMode = this._isSimpleQuery();
		$element.html( this._getHtml() );
	};

	/**
	 * Set the change listener
	 *
	 * @param {Function} listener a function called when query changed
	 */
	SELF.prototype.setChangeListener = function( listener ) {
		this._changeListener = listener;
	};

	/**
	 * @private
	 */
	SELF.prototype._i18n = function( key ) {
		if ( !$.i18n ) {
			return this._labels[key];
		}

		return $.i18n( I18N_PREFIX + key );
	};

	/**
	 * @private
	 */
	SELF.prototype._getHtml = function() {
		var self = this,
			$html = $( '<div>' ),
			$findTable = $( '<table>' ).bootstrapTable( TABLE_OPTIONS ),
			$showTable = $( '<table>' ).bootstrapTable( TABLE_OPTIONS );

		$.each( this._triples, function( k, triple ) {
			if ( self._isNotRelevant( triple.triple ) ) {
				return;
			}

			if ( self._isInShowSection( triple.triple ) ) {
				$showTable.append( self._getTripleHtml( triple ) );
				return;
			}

			$findTable.append( self._getTripleHtml( triple ) );
		} );

		return $html.append(
				this._createSection( $findTable, this._createFindButton( $findTable ) ),
				this._createSection( $showTable, this._createShowButton( $showTable ) ),
				this._getLimitSection()
			);
	};

	/**
	 * @private
	 */
	SELF.prototype._getLimitSection = function() {
		var $limitSection = $( '<div>' ),
			$limit = $( '<a data-type="number">' )
				.attr( 'href', '#' )
				.text( 'Limit' )
				.data( 'value', this._query.getLimit() ),
			$value = $( '<span>' )
				.text( this._query.getLimit() ? this._query.getLimit() : '' );

		var self = this;
		this._selectorBox.add( $limit, null, function( value ) {
			if ( value === '0' ) {
				value = null;
			}

			$value.text( value || '' );
			self._query.setLimit( value );

			if ( self._changeListener ) {
				self._changeListener( self );
			}
		}, {
			trash: function() {
				self._query.setLimit( null );
				$limit.data( 'value', '' );
				$value.text( '' );
				if ( self._changeListener ) {
					self._changeListener( self );
				}
				return true;//close popover
			}
		} );

		return $limitSection.append( $limit.append( ' ', $value ) );
	};

	/**
	 * @private
	 */
	SELF.prototype._createSection = function( $table, $button ) {
		return $( '<table>' ).append( $( '<tr>' ).append(
				$( '<td>' ).append( $button ),
				$( '<td>' ).append( $table )
			) );
	};

	/**
	 * @private
	 */
	SELF.prototype._createFindButton = function( $table ) {
		// Show link
		var $button = $( '<a class="btn">' )
			.text( this._i18n( 'filter' ) )
			.attr( 'href', '#' ).prepend(
				'<span class="fa fa-plus" aria-hidden="true"></span>', ' ' )
				.tooltip( {
					title: 'Click to add new item'
				} ).attr( 'data-type', 'item' ).attr( 'data-auto_open', true );

		// SelectorBox
		var self = this;
		this._selectorBox.add( $button, null, function( id, name, data ) {
			var entity = 'http://www.wikidata.org/entity/' + id;// FIXME technical debt

			var variable = self._query.getBoundVariables().shift();
			if ( !variable ) {
				variable = '?' + '_' + name.replace( /( |[^a-z0-9])/gi, '_' );
			}

			var prop = 'http://www.wikidata.org/prop/direct/' + ( data && data[id] && data[id].propertyId || 'P31' );// FIXME technical debt
			var triple = self._query.addTriple( variable, prop, entity, false );
			if ( !self._query.hasVariable( variable ) ) {
				self._query.addVariable( variable );
			}

			$table.append( self._getTripleHtml( triple ) );

			if ( self._changeListener ) {
				self._changeListener( self );
			}
		} );

		return $button;
	};

	/**
	 * @private
	 */
	SELF.prototype._createShowButton = function( $table ) {
		// Show link
		var $button = $( '<a class="btn">' )
			.text( this._i18n( 'show' ) )
			.attr( 'href', '#' ).prepend(
				'<span class="fa fa-plus" aria-hidden="true"></span>', ' ' )
				.tooltip( {
					title: 'Click to add new property'
				} ).attr( 'data-type', 'property' ).attr( 'data-auto_open', true );

		// SelectorBox
		var self = this;
		this._selectorBox.add( $button, null, function( id, name ) {
			var prop = 'http://www.wikidata.org/prop/direct/' + id;// FIXME technical debt

			var subject = self._query.getBoundVariables().shift();
			if ( !subject ) {
				return;
			}
			var variable2 = '?' + name.replace( /( |[^a-z0-9])/gi, '_' );// FIXME technical debt

			var triple = self._query.addTriple( subject, prop, variable2, true );
			self._query.addVariable( variable2 );

			$table.append( self._getTripleHtml( triple ) );

			if ( self._changeListener ) {
				self._changeListener( self );
			}
		} );

		return $button;
	};

	/**
	 * @private
	 */
	SELF.prototype._isNotRelevant = function( triple ) {
		if ( FILTER_PREDICATES[triple.predicate] ) {
			return true;
		}

		if ( this._isSimpleMode && this._isInShowSection( triple ) &&
				( this._query.hasVariable( triple.object ) === false &&
						this._query.hasVariable( triple.object + 'Label' ) === false ) ) {
			return true;
		}

		return false;
	};

	/**
	 * @private
	 */
	SELF.prototype._isInShowSection = function( triple ) {
		var bindings = this._query.getBindings();

		// Must match ?value wdt:Pxx ?item
		if ( this._isVariable( triple.subject ) && this._isVariable( triple.object ) &&
				!bindings[triple.subject] && !bindings[triple.object] ) {
			return true;
		}

		return false;
	};

	/**
	 * @private
	 */
	SELF.prototype._getTripleHtml = function( triple ) {
		var self = this,
			$triple = $( '<tr>' ),
			bindings = this._query.getBindings();

		$.each( triple.triple, function( k, entity ) {
			if ( self._isVariable( entity ) && bindings[entity] &&
					typeof bindings[entity].expression === 'string' ) {
				entity = bindings[entity].expression;
			}

			if (  self._isVariable( entity ) ) {
				if ( self._isSimpleMode ) {
					return;
				}
				entity = entity.replace( '?', '' );
			}

			if ( entity.type && entity.type === 'path' ) {
				$triple.append( $( '<td>' ).append( self._getTripleEntityPathHtml( entity, triple, k ) ), ' ' );
			} else {
				$triple.append(  $( '<td>' ).append( self._getTripleEntityHtml( entity, triple, k ) ), ' ' );
			}
		} );

		return $triple;
	};

	/**
	 * @private
	 */
	SELF.prototype._isVariable = function( entity ) {
		return typeof entity === 'string' && entity.startsWith( '?' );
	};

	/**
	 * @private
	 */
	SELF.prototype._isSimpleQuery = function() {
		var boundVariables = {};

		var self = this;
		$.each( this._triples, function( k, t ) {
			// Must match ?value wdt:Pxx ?item
			if ( self._isVariable( t.triple.subject ) &&
					self._isVariable( t.triple.object ) === false ) {
				boundVariables[t.triple.subject] = true;
			}
		} );

		return Object.keys( boundVariables ).length <= 1;
	};

	/**
	 * @private
	 */
	SELF.prototype._getTripleEntityPathHtml = function( path, triple ) {
		var self = this,
			$path = $( '<span>' );
		$.each( path.items, function( k, v ) {
			if ( v.type && v.type === 'path' ) {
				$path.append( self._getTripleEntityPathHtml( v, triple ) );
				return;
			}

			if ( k > 0 && path.pathType === '/' ) {
				$path.append( ' ' + self._i18n( 'or' ) + ' ' + self._i18n( 'subtype' ) + ' ' );
			}
			if ( path.pathType === '*' ) {
				$path.append( ' ' + self._i18n( 'any' ) + ' ' );
			}

			// FIXME: Do not fake triple here
			var newTriple = path.items.reduce( function( o, v, i ) {
				o[i] = v;
				return o;
			}, {} );
			newTriple = $.extend( newTriple, triple.triple );
			triple = $.extend( {}, triple );
			triple.triple = newTriple;

			$path.append( self._getTripleEntityHtml( v, triple, k ) );
		} );

		return $path;
	};

	/**
	 * @private
	 */
	SELF.prototype._getTripleEntityHtml = function( entity, triple, key ) {
		var self = this,
			$label = $( '<span>' );

		this._getLabel( entity ).done( function( label, id, description, type ) {
			var $link = $( '<a>' )
				.text( label )
				.attr( { 'data-id': id, 'data-type': type, href: '#' } )
				.appendTo( $label );

			$label.tooltip( {
				'title': '(' + id + ') ' + description
			} );
			$( $label ).on( 'show.bs.tooltip', function() {
				if ( $( '.tooltip' ).is( ':visible' ) ) {
					$( '.tooltip' ).not( this ).hide();
				}
			} );

			//TODO: refactor method
			self._selectorBox.add( $link, triple.triple, function( selectedId ) {
				var newEntity = entity.replace( new RegExp( id + '$' ), '' ) + selectedId;// TODO: technical debt

				$label.replaceWith( self._getTripleEntityHtml( newEntity, triple, key ) );

				if ( !self._isVariable( triple.triple[key] ) ) {
					triple.triple[key] = newEntity;
				} else {
					self._query.getBindings()[triple.triple[key]].expression = newEntity;
				}

				if ( self._changeListener ) {
					self._changeListener( self );
				}
			}, {
				trash: function() {
					triple.remove();

					var variable = triple.triple.object;
					if ( triple.triple.object === entity ||
							( triple.triple.object.startsWith( '?' ) === false && triple.triple.predicate === entity ) ) {
						variable = triple.triple.subject;
					}
					$label.closest( 'tr' ).remove();

					if ( self._query.getBoundVariables().indexOf( variable ) === -1 ) {
						self._query.removeVariable( variable );
						self._query.removeVariable( variable + 'Label' );
					}

					if ( self._changeListener ) {
						self._changeListener( self );
					}
					$( '.tooltip' ).hide();
					return true;//close popover
				},
				tag: function() {
					if ( triple.triple.object.startsWith( '?' ) ) {
						self._query
								.addVariable( triple.triple.object +
										'Label' );
					} else {
						self._query
								.addVariable( triple.triple.subject +
										'Label' );
					}
					if ( self._changeListener ) {
						self._changeListener( self );
					}
					return true;
				}
			}
			);
		} ).fail( function() {
			$label.text( entity );
		} );

		return $label;
	};

	/**
	 * @private
	 */
	SELF.prototype._getLabel = function( url ) {
		var deferred = $.Deferred();

		var entity = url.match( /(Q|P)([0-9]+)/ );// TODO: make use of Rdf namespaces
		if ( !entity ) {
			return deferred.reject().promise();
		}

		var type = {
			P: 'property',
			Q: 'item'
		};
		type = type[entity[1]];
		var term = entity[0];

		this._api.searchEntities( term, type ).done( function( data ) {
			$.each( data.search, function( key, value ) {
				deferred.resolve( value.label, value.id, value.description, type );
				return false;
			} );
		} );

		return deferred.promise();
	};

	return SELF;
}( jQuery, wikibase ) );
