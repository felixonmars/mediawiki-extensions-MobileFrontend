( function( M, $ ) {
	var Overlay = M.require( 'Overlay' ),
		Page = M.require( 'Page' ),
		schema = M.require( 'loggingSchemas/mobileWebEditing' ),
		toast = M.require( 'toast' ),
		user = M.require( 'user' ),
		EditorOverlayBase;

	/**
	 * @extends Overlay
	 * @class EditorOverlayBase
	 */
	EditorOverlayBase = Overlay.extend( {
		defaults: {
			continueMsg: mw.msg( 'mobile-frontend-editor-continue' ),
			saveMsg: mw.msg( 'mobile-frontend-editor-save' ),
			cancelMsg: mw.msg( 'mobile-frontend-editor-cancel' ),
			keepEditingMsg: mw.msg( 'mobile-frontend-editor-keep-editing' ),
			summaryRequestMsg: mw.msg( 'mobile-frontend-editor-summary-request' ),
			summaryMsg: mw.msg( 'mobile-frontend-editor-summary-placeholder' ),
			placeholder: mw.msg( 'mobile-frontend-editor-placeholder' ),
			waitMsg: mw.msg( 'mobile-frontend-editor-wait' ),
			captchaMsg: mw.msg( 'mobile-frontend-account-create-captcha-placeholder' ),
			captchaTryAgainMsg: mw.msg( 'mobile-frontend-editor-captcha-try-again' ),
			switchMsg: mw.msg( 'mobile-frontend-editor-switch-editor' ),
			visualEditorMsg: mw.msg( 'mobile-frontend-editor-visual-editor' ),
			sourceEditorMsg: mw.msg( 'mobile-frontend-editor-source-editor' ),
		},
		template: M.template.get( 'modules/editor/EditorOverlayBase.hogan' ),
		className: 'overlay editor-overlay',
		log: function( action, errorText ) {
			var
				data = {
					action: action,
					section: this.sectionId,
					editor: this.editor,
					funnel: this.funnel
				};
			if ( errorText ) {
				data.errorText = errorText;
			}
			schema.log( data );
		},
		/**
		 * Reveals a spinner at the top of the overlay.
		 * @method
		 */
		showSpinner: function () {
			this.$spinner.show();
		},
		/**
		 * Hides a spinner at the top of the overlay.
		 * @method
		 */
		clearSpinner: function() {
			this.$spinner.hide();
		},

		_updateEditCount: function() {
			this.editCount += 1;
			mw.config.set( 'wgUserEditCount', this.editCount );
		},
		/**
		 * If this is a new article, require confirmation before saving.
		 */
		confirmSave: function() {
			if ( this.isNewPage &&
				!window.confirm( mw.msg( 'mobile-frontend-editor-new-page-confirm', mw.user ) )
			) {
				return false;
			} else {
				return true;
			}
		},
		/**
		 * Executed when page save is complete. Handles reloading the page, showing toast
		 * messages, and setting mobile edit cookie.
		 */
		onSave: function() {
			this.log( 'success' );
			var title = this.options.title,
				extraToastClasses = '', msg;

			// FIXME: use generic method for following 3 lines
			M.pageApi.invalidatePage( title );
			new Page( { title: title, el: $( '#content_wrapper' ) } ).on( 'ready', M.reloadPage ).
				on( 'error', function() {
					// Force refresh when something goes wrong (see bug 62175 for example)
					window.location = mw.util.getUrl( title );
				} );

			if ( this.isNewPage ) {
				msg = 'mobile-frontend-editor-success-new-page';
			} else if ( this.isNewEditor ) {
				extraToastClasses = 'landmark';
				msg = 'mobile-frontend-editor-success-landmark-1';
			} else {
				msg = 'mobile-frontend-editor-success';
			}

			// show a toast notification
			toast.show( mw.msg( msg ), extraToastClasses );

			// Set a cookie for 30 days indicating that this user has edited from
			// the mobile interface.
			$.cookie( 'mobileEditor', 'true', { expires: 30 } );
			this._updateEditCount();
			this.hide( true );
		},
		initialize: function( options ) {
			if ( !options.previewingMsg ) {
				options.previewingMsg = mw.msg( 'mobile-frontend-editor-previewing-page', options.title );
			}
			if ( options.isNewPage ) {
				options.placeholder = mw.msg( 'mobile-frontend-editor-placeholder-new-page', mw.user );
			}
			// change the message to request a summary when not in article namespace
			if ( mw.config.get( 'wgNamespaceNumber' ) !== 0 ) {
				options.summaryRequestMsg = mw.msg( 'summary' );
			}
			// If terms of use is enabled, include it in the licensing message
			if ( $( '#footer-places-terms-use' ).length > 0 ) {
				options.licenseMsg = mw.msg(
					'mobile-frontend-editor-licensing-with-terms',
					$( '#footer-places-terms-use' ).html(),
					mw.config.get( 'wgMFLicenseLink' )
				);
			} else {
				options.licenseMsg = mw.msg(
					'mobile-frontend-editor-licensing',
					mw.config.get( 'wgMFLicenseLink' )
				);
			}
			this.editCount = user.getEditCount();
			this.isNewPage = options.isNewPage;
			this.isNewEditor = options.isNewEditor;
			this.sectionId = options.sectionId;
			this.funnel = options.funnel;

			this._super( options );
		},
		reportError: function ( msg, errorText ) {
			this.log( 'error', errorText );
			toast.show( msg, 'toast error' );
		},
		_prepareForSave: function() {
			this.log( 'save' );
			// Scroll to the top of the page, so that the summary input is visible
			// (even if overlay was scrolled down when editing) and weird iOS header
			// problems are avoided (header position not updating to the top of the
			// screen, instead staying lower until a subsequent scroll event).
			window.scrollTo( 0, 1 );
		},
		_save: function() {
			this.confirmAborted = false;
			// Ask for confirmation in some cases
			if ( !this.confirmSave() ) {
				this.confirmAborted = true;
				return;
			}
			this.log( 'submit' );
		},
		postRender: function( options ) {
			var self = this;
			this.$spinner = self.$( '.spinner' );
			// log edit attempt
			this.log( 'attempt' );

			this.$( '.cancel' ).on( M.tapEvent( 'click' ), function() {
				// log cancel attempt
				self.log( 'cancel' );
			} );
			this._super( options );
			this._showHidden( '.initial-header' );
		},
		/**
		 * Set up the editor switching interface
		 * The actual behavior of the editor buttons is initialized in postRender()
		 */
		initializeSwitcher: function() {
			this.$( '.editor-switcher' ).on( 'click', function( ev ) {
				var $self = $( this );
				ev.preventDefault();
				// Prevent double toggling
				ev.stopPropagation();
				// Exit early if switcher is disabled
				if ( $self.hasClass( 'disabled' ) ) {
					return false;
				}
				$self.toggleClass( 'selected' );
				$( '.switcher-drop-down' ).toggle();
				// If you click outside the drop-down, hide the drop-down
				$( document ).one( 'click', function() {
					$( '.switcher-drop-down' ).hide();
					$self.removeClass( 'selected' );
				} );
			} );
		},
		hide: function( force ) {
			var confirmMessage = mw.msg( 'mobile-frontend-editor-cancel-confirm' );
			if ( force || !this._hasChanged() || window.confirm( confirmMessage ) ) {
				return this._super();
			} else {
				return false;
			}
		},
		_showCaptcha: function( url ) {
			var self = this, $input = this.$( '.captcha-word' );

			if ( this.captchaShown ) {
				$input.val( '' );
				$input.attr( 'placeholder', this.options.captchaTryAgainMsg );
				setTimeout( function() {
					$input.attr( 'placeholder', self.options.captchaMsg );
				}, 2000 );
			}

			this.$( '.captcha-panel img' ).attr( 'src', url );
			this._showHidden( '.save-header, .captcha-panel' );

			this.captchaShown = true;
		}
	} );

	M.define( 'modules/editor/EditorOverlayBase', EditorOverlayBase );
}( mw.mobileFrontend, jQuery ) );
