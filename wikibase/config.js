/* exported CONFIG */
var CONFIG = ( function ( window, $ ) {
	'use strict';

	function getUserLanguage() {
		var lang = ( navigator.languages && navigator.languages[0] ) ||
			navigator.language ||
			navigator.userLanguage;

		if ( lang && typeof lang === 'string' ) {
			return lang.split( '-' ).shift();
		}

		return null;
	}

	var root = 'https://query.wikidata.org/';

	var configDeploy = {
		language: getUserLanguage() || 'en',
		api: {
			sparql: {
				uri: '/bigdata/namespace/wdq/sparql'
			},
			wikibase: {
				uri: 'https://www.wikidata.org/w/api.php'
			}
		},
		i18nLoad: function( lang ) {
			var loadFallbackLang = null;
			if ( lang !== this.language ) {
				//load default language as fallback language
				loadFallbackLang = $.i18n().load( 'i18n/' + this.language + '.json', this.language );
			}
			return $.when(
					loadFallbackLang,
					$.i18n().load( 'i18n/' + lang + '.json', lang )
				);
		},
		brand: {
			logo: 'logo.svg',
			title: 'Wikidata Query'
		},
		location: {
			root: root,
			index: root
		}
	};

	var hostname = window.location.hostname.toLowerCase();

	if ( hostname === '' || hostname === 'localhost' || hostname === '127.0.0.1' ) {

		// Override for local debugging
		return $.extend( true, {}, configDeploy, {
			api: {
				sparql: {
					uri: 'https://query.wikidata.org/bigdata/namespace/wdq/sparql'

				}
			},
			i18nLoad: function( lang ) {
				return $.when(
						$.i18n().load( 'i18n/' + lang + '.json', lang ),
						$.i18n().load( 'node_modules/jquery.uls/i18n/' + lang + '.json', lang )
					);
			},
			brand: {
				title: 'Localhost'
			},
			location: {
				root: './',
				index: './index.html'
			}
		} );
	}

	return configDeploy;

} )( window, jQuery );
