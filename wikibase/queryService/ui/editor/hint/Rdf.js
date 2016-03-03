var wikibase = wikibase || {};
wikibase.queryService = wikibase.queryService || {};
wikibase.queryService.ui = wikibase.queryService.ui || {};
wikibase.queryService.ui.editor = wikibase.queryService.ui.editor || {};
wikibase.queryService.ui.editor.hint = wikibase.queryService.ui.editor.hint || {};

( function( $, wb ) {
	'use strict';

	var MODULE = wb.queryService.ui.editor.hint;

	var ENTITY_TYPES = {
			'http://www.wikidata.org/prop/direct/': 'property',
			'http://www.wikidata.org/prop/': 'property',
			'http://www.wikidata.org/prop/novalue/': 'property',
			'http://www.wikidata.org/prop/statement/': 'property',
			'http://www.wikidata.org/prop/statement/value/': 'property',
			'http://www.wikidata.org/prop/qualifier/': 'property',
			'http://www.wikidata.org/prop/qualifier/value/': 'property',
			'http://www.wikidata.org/prop/reference/': 'property',
			'http://www.wikidata.org/prop/reference/value/': 'property',
			'http://www.wikidata.org/wiki/Special:EntityData/': 'item',
			'http://www.wikidata.org/entity/': 'item'
	},
	ENTITY_SEARCH_API_ENDPOINT = 'https://www.wikidata.org/w/api.php?action=wbsearchentities&' +
		'search={term}&format=json&language=en&uselang=en&type={entityType}&continue=0';

	/**
	 * Code completion for Wikibase entities RDF prefixes in SPARQL
	 * completes SPARQL keywords and ?variables
	 *
	 * licence GNU GPL v2+
	 *
	 * @author Jonas Kress
	 * @param {wikibase.queryService.RdfNamespace} rdfNamespace
	 * @constructor
	 */
	var SELF = MODULE.Rdf = function( rdfNamespaces ) {
		this._rdfNamespaces = rdfNamespaces;

		if( !this._rdfNamespaces ){
			this._rdfNamespaces = wikibase.queryService.RdfNamespaces;
		}
	};

	/**
	 * @property {wikibase.queryService.RdfNamespace}
	 * @private
	 **/
	SELF.prototype._rdfNamespaces = null;

	/**
	 * Get list of hints
	 *
	 * @return {jQuery.promise} Returns the completion as promise ({list:[], from:, to:})
	 **/
	SELF.prototype.getHint = function( editorContent, lineContent, lineNum, cursorPos ) {
		var deferred = new $.Deferred(),
		 currentWord = this._getCurrentWord( lineContent, cursorPos ),
		 	list,
			prefix,
			term,
			entityPrefixes,
			self = this;

		if ( !currentWord.word.match( /\S+:\S*/ ) ) {
			return deferred.reject().promise();
		}

		prefix = this._getPrefixFromWord( currentWord.word.trim() );
		term = this._getTermFromWord( currentWord.word.trim() );
		entityPrefixes = this._extractPrefixes( editorContent );

		if ( !entityPrefixes[ prefix ] ) { // unknown prefix
			list = [{ text: term, displayText: 'Unknown prefix \'' + prefix + ':\'' }];
			return deferred.resolve( this._getHintCompletion( lineNum, currentWord, prefix, list ) ).promise();
		}

		if ( term.length === 0 ) { // empty search term
			list = [{ text: term, displayText: 'Type to search for an entity' }];
			return deferred.resolve( this._getHintCompletion( lineNum, currentWord, prefix, list ) ).promise();
		}

		if ( entityPrefixes[ prefix ] ) { // search entity
			this._searchEntities( term, entityPrefixes[ prefix ] ).done( function ( list ) {
				return deferred.resolve( self._getHintCompletion( lineNum, currentWord, prefix, list ) );
			} );
		}

		return deferred.promise();
	};

	SELF.prototype._getPrefixFromWord = function( word ) {
		return word.split( ':' ).shift();
	};

	SELF.prototype._getTermFromWord = function( word ) {
		return word.split( ':' ).pop();
	};

	SELF.prototype._getHintCompletion = function( lineNum, currentWord, prefix, list ) {
		var completion = { list: [] };
		completion.from = {line: lineNum, char: currentWord.start + prefix.length + 1 };
		completion.to = {line: lineNum, char: currentWord.end };
		completion.list = list;

		return completion;
	};

	SELF.prototype._searchEntities = function( term, type ) {
		var entityList = [],
			deferred = $.Deferred();

		$.ajax( {
			url: ENTITY_SEARCH_API_ENDPOINT.replace( '{term}', term ).replace( '{entityType}', type ),
			dataType: 'jsonp'
		} ).done( function ( data ) {
			$.each( data.search, function ( key, value ) {
				entityList.push( {
					className: 'wikibase-rdf-hint',
					text: value.id,
					displayText: value.label + ' (' + value.id + ') ' + value.description + '\n'
				} );
			} );

			deferred.resolve( entityList );
		} );

		return deferred.promise();
	};

	SELF.prototype._getCurrentWord = function( line, position ) {
		var pos = position -1,
			colon = false;

		if( pos < 0 ){
			pos = 0;
		}

		while( line.charAt( pos ).match( /\w/ ) ||
			( line.charAt( pos ) === ' ' && colon === false ) ||
			( line.charAt( pos ) === ':' && colon === false ) ){

			if( line.charAt( pos ) === ':' ){
				colon = true;
			}
			pos--;
			if( pos < 0 ){
				break;
			}
		}
		var left = pos + 1;

		pos = position;
		while( line.charAt( pos ).match( /\w/ ) ){
			pos++;
			if( pos >= line.length ){
				break;
			}
		}
		var right = pos;

		var word = line.substring( left, right );
		return { word: word, start: left, end: right };
	};

	SELF.prototype._extractPrefixes = function( text ) {
		var prefixes = this._rdfNamespaces.getPrefixMap(ENTITY_TYPES),
			lines = text.split( '\n' ),
			matches;

		$.each( lines, function ( index, line ) {
			// PREFIX wd: <http://www.wikidata.org/entity/>
			if ( ( matches = line.match( /(PREFIX) (\S+): <([^>]+)>/ ) ) ) {
				if ( ENTITY_TYPES[ matches[ 3 ] ] ) {
					prefixes[ matches[ 2 ] ] = ENTITY_TYPES[ matches[ 3 ] ];
				}
			}
		} );

		return prefixes;
	};

}( jQuery, wikibase ) );
