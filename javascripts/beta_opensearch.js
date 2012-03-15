/*global document, window, MobileFrontend, navigator, placeholder */
/*jslint sloppy: true, white:true, maxerr: 50, indent: 4, plusplus: true*/
MobileFrontend.opensearch = (function() {
	var apiUrl = '/api.php', timer = -1, typingDelay = 500,
		numResults = 15, term,
		search = document.getElementById( 'search' ),
		sq = document.getElementById( 'sq' ),
		sb = document.getElementById( 'searchbox' ),
		content = document.getElementById( 'content' ),
		footer = document.getElementById( 'footer' ),
		clearSearch = document.getElementById( 'clearsearch' ),
		focused = false,
		viewportmeta, originalViewport,
		u = MobileFrontend.utils;

	apiUrl = MobileFrontend.setting( 'scriptPath' ) + apiUrl;

	function hideResults() {
		results.style.display = 'none';
	}
	
	viewportmeta = u( 'meta[name="viewport"]' )
	if ( viewportmeta ) {
		viewportmeta = viewportmeta[0];
		originalViewport = viewportmeta.getAttribute( 'content' );
	}
	// prevent auto-zoom in on clicking search for certain browsers e.g. palm pre and ipad
	function resetViewPort() {
		if ( viewportmeta ) {
			viewportmeta.setAttribute( 'content', 'minimum-scale=1.0, maximum-scale=1.0, initial-scale=1.0');
			u( document.body ).bind( 'gesturestart', function () {
				viewportmeta.setAttribute( 'content', originalViewport );
			} );
		}
	}

	resetViewPort();

	search.onfocus = function() {
		var rrd, rrdD;
		sb = document.getElementById( 'searchbox' );
		sq = document.getElementById( 'sq' );
		content = document.getElementById( 'content' );
		footer = document.getElementById( 'footer' );
		resetViewPort();

		if ( !focused ) {
			MobileFrontend.utils( document.body ).addClass( 'full-screen-search' );

			rrd = document.getElementById( 'remove-results' );
			if ( !rrd ) {
				rrd = document.createElement( 'a' );
				rrd.setAttribute( 'href', '#' );
				rrd.setAttribute( 'id', 'remove-results' );
				u( rrd ).bind( 'click', removeResults );
				rrdD = document.createElement( 'div' );
				rrdD.setAttribute( 'id', 'left-arrow' );
				rrd.appendChild( rrdD );
				sq.insertBefore( rrd, sq.firstChild );
			}
			focused = true;
		}
	};

	function removeResults() {
		MobileFrontend.utils( document.body ).removeClass( 'full-screen-search' );

		if ( focused ) {
			focused = false;
		}
		if ( clearSearch ) {
			clearSearch.style.display = 'none';
		}
	}

	function whichElement( e ) {
		var targ;
		if ( !e ) {
			e = window.event;
		}
		if ( e.target ) {
			targ = e.target;
		} else if ( e.srcElement ) {
			targ = e.srcElement;
		}

		if ( targ.nodeType === 3 ) {
			targ = targ.parentNode;
		}

		e.cancelBubble = true;
		e.stopPropagation();
		if ( targ.className === "suggestion-result" ||
			 targ.className === "search-result-item" ||
			 targ.className === "suggestions-result" ||
			 targ.className === "sq-val-update" ||
			 targ.id === 'results' ||
			 targ.id === 'search' ||
			 targ.id === 'searchbox' ||
			 targ.id === 'sq' ||
			 targ.id === 'placeholder' ||
			 targ.id === 'clearsearch' ||
			 targ.tagName === 'BODY' ) {
				if ( targ.id === 'clearsearch' && results ) {
					results.innerHTML = '';
				}
		} else {
			hideResults();
		}
	}

	var performSearch = function(ev) {
		ev.preventDefault();
		clearTimeout( timer );
		term = search.value;
		if ( term.length < 1 ) {
			results.innerHTML = '';
		} else {
			term = encodeURIComponent( term );
			timer = setTimeout( function () { searchApi( term ); }, typingDelay );
		}
	};
	u( search ).bind( 'keyup', performSearch );
	u( document.getElementById( 'searchForm' ) ).bind( 'submit', performSearch );
	u( search ).bind( 'blur', performSearch ); // for opera mini etc

	function searchApi( term ) {
		url = apiUrl + '?action=opensearch&limit=' + numResults + '&namespace=0&format=xml&search=' + term;
		u.ajax( { url: url,
			success: function(xml) {
				if( u( document.body ).hasClass( 'full-screen-search' ) ) {
					writeResults( createObjectArray( xml ) );
				}
			}
			} );
	}

	function createObjectArray( responseXml ) {
		var sections = [], i, item, section,
			items = responseXml.getElementsByTagName( 'Item' );
		for ( i = 0; i < items.length; i++ ) {
			item = items[i];
			section = {
				label: item.getElementsByTagName( 'Text' )[0].textContent,
				value: item.getElementsByTagName( 'Url' )[0].textContent
			};
			sections.push( section );
		}
		return sections;
	}

	function htmlEntities( str ) {
		var text = document.createTextNode( str ),
			el = document.createElement( 'div' );
		el.appendChild( text );
		return el.innerHTML;
	}

	function escapeJsString( str ) {
		return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	}

	function writeResults( sections ) {
		var results = document.getElementById( 'results' ), suggestions, i,
			term = htmlEntities( document.getElementById( 'search' ).value ),
			section, escapedTerm, suggestionsResult, link, label;

		results.style.display = 'block';
		if ( search ) {
			search.focus();
		}
		if ( !sections || sections.length < 1 ) {
			results.innerHTML = '<ul class="suggestions-results" title="No Results"><li class="suggestions-result">No Results</li></div>';
		} else {
			if( results.firstChild ) {
				results.removeChild( results.firstChild );
			}
			suggestions = document.createElement( 'ul' );
			suggestions.className = 'suggestions-results';
			results.appendChild( suggestions );

			for ( i = 0; i < sections.length; i++ ) {
				section = sections[i];
				suggestionsResult = document.createElement( 'li' );
				suggestionsResult.setAttribute( 'title', section.label );
				suggestionsResult.className = 'suggestions-result';

				link = document.createElement( 'a' );
				link.setAttribute( 'href', section.value.replace( /^(?:\/\/|[^\/]+)*\//, '/' ) );
				link.className = 'search-result-item';
				label = document.createTextNode( section.label );
				link.appendChild( label );

				suggestionsResult.appendChild( link );
				suggestions.appendChild( suggestionsResult );
				// TODO: simplify the highlighting code to not use htmlEntities
				// highlight matched term
				escapedTerm = escapeJsString( term );
				link.innerHTML = link.innerHTML.replace( new RegExp( '(' + escapedTerm + ')' , 'ig'),
					'<strong>$1</strong>' );
			}
		}
	}

	function initClearSearch() {
		var clearSearch = document.getElementById( 'clearsearch' ),
			search = document.getElementById( 'search' );
		function handleClearSearchLink() {
			if ( clearSearch ) {
				if ( search.value.length > 0 ) {
					clearSearch.style.display = 'block';
				} else {
					clearSearch.style.display = 'none';
				}
			}
		}

		function clearSearchBox( event ) {
			search.value = '';
			clearSearch.style.display = 'none';
			event.preventDefault();
		}

		function onFocusHandler() {
			search.select();
		}
		u( clearSearch ).bind( 'mousedown', clearSearchBox );
		u( search ).bind( 'keyup', handleClearSearchLink );
		u( search ).bind( 'click', onFocusHandler );
	}

	function init() {
		var results = document.getElementById( 'results' );
		results.onmousedown = whichElement;
		document.body.onmousedown = whichElement;
		document.body.ontouchstart = whichElement;
		results.ontouchstart = whichElement;
	}
	init();
	initClearSearch();

	return {
		init: init,
		initClearSearch: initClearSearch,
		writeResults: writeResults,
		createObjectArray: createObjectArray,
		removeResults: removeResults
	};

}());
