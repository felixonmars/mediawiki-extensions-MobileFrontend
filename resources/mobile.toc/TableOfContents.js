( function ( M ) {
	var SchemaMobileWebUIClickTracking = M.require(
			'mobile.loggingSchemas/SchemaMobileWebUIClickTracking' ),
		uiSchema = new SchemaMobileWebUIClickTracking(),
		View = M.require( 'mobile.view/View' ),
		Icon = M.require( 'mobile.startup/Icon' );

	/**
	 * View for table of contents
	 * @class TableOfContents
	 * @extends View
	 * @uses Icon
	 * @uses SchemaMobileWebClickTracking
	 */
	function TableOfContents() {
		View.apply( this, arguments );
	}

	OO.mfExtend( TableOfContents, View, {
		templatePartials: {
			tocHeading: mw.template.get( 'mobile.toc', 'heading.hogan' )
		},
		/**
		 * @cfg {Object} defaults Default options hash.
		 * @cfg {String} defaults.tocIcon HTML of the Table of Contents icon.
		 * @cfg {String} defaults.contentsMsg TOC contents message.
		 */
		defaults: {
			tocIcon: new Icon( {
				name: 'toc',
				additionalClassNames: 'toc-button'
			} ).toHtmlString(),
			contentsMsg: mw.msg( 'toc' )
		},
		tagName: 'div',
		className: 'toc-mobile',
		template: mw.template.get( 'mobile.toc', 'toc.hogan' ),
		events: {
			// Click tracking for table of contents so we can see if people interact with it
			'click h2': 'onTocToggle',
			'click a': 'onLinkClick'
		},
		/**
		 * Log toggling the header
		 */
		onTocToggle: function () {
			uiSchema.log( {
				name: 'page-toc-toggle'
			} );
		},
		/**
		 * Log clicking a TOC link
		 */
		onLinkClick: function () {
			uiSchema.log( {
				name: 'page-toc-link'
			} );
		}
	} );

	M.define( 'mobile.toc/TableOfContents', TableOfContents );
}( mw.mobileFrontend ) );
