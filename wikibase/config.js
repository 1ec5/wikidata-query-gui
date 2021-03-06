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

	var root = 'https://sophox.org/';

	var configDeploy = {
		language: getUserLanguage() || 'en',
		api: {
			osm: {
				version: '0.5',
				program: 'Sophox',
				baseurl: 'https://www.openstreetmap.org',
				apiurl: 'https://api.openstreetmap.org',
				oauth_key: '9soeWHZj2aoJ27LPnW4wwOpZkQEhNKFcYO1ITdus',
				oauth_secret: 'YK3qtCW6GBQ9U1lU3yxjXC66tdPUCOIHS0fMXrVR',
			},
			sparql: {
				uri: '/sparql',
				serviceuri: '/store'
			},
			wikibase: {
				uri: 'https://wiki.openstreetmap.org/w/api.php'
			}
		},
		i18nLoad: function( lang ) {
			var loadFallbackLang = null;
			if ( lang !== this.language ) {
				//load default language as fallback language
				loadFallbackLang = $.i18n().load( 'i18n', this.language );
			}
			return $.when(
					loadFallbackLang,
					$.i18n().load( 'i18n', lang )
				);
		},
		brand: {
			logo: 'logo.svg',
			title: 'OSM Sophox'
		},
		location: {
			root: root,
			index: root
		},
		showBirthdayPresents: new Date().getTime() >= Date.UTC( 2017, 10 - 1, 29 )
	};

	var hostname = window.location.hostname.toLowerCase();

	if ( hostname === '' || hostname === 'localhost' || hostname === '127.0.0.1' ) {
		// Override for local debugging
		return $.extend( true, {}, configDeploy, {
			api: {
				osm: {
					baseurl: 'https://master.apis.dev.openstreetmap.org',
					apiurl: 'https://master.apis.dev.openstreetmap.org',
					oauth_key: 'zUUyJWdtiP4ABHMoHjO71SarsA3CQFcjpKVsp7gp',
					oauth_secret: 'ZSSX1cDxlhv6U3wgLq4DR6QfibVLXWGOnsLoQbAt',
				},
				sparql: {
					uri: 'http://sophox.localhost/sparql',
					serviceuri: 'http://sophox.localhost/store',
				}
			},
			i18nLoad: function( lang ) {
				return $.when(
						$.i18n().load( 'i18n', lang ),
						$.i18n().load( 'node_modules/jquery.uls/i18n', lang )
					);
			},
			brand: {
				title: 'Localhost'
			},
			location: {
				root: './',
				index: './index.html'
			},
			showBirthdayPresents: true
		} );
	}

	return configDeploy;

} )( window, jQuery );
