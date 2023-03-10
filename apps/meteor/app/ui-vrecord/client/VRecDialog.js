import { Blaze } from 'meteor/blaze';
import { Template } from 'meteor/templating';

import { dispatchToastMessage } from '../../../client/lib/toast';
import { VideoRecorder } from '../../ui/client';
import { t } from '../../utils/client';

export const VRecDialog = new (class {
	opened = false;

	dialogView = null;

	init() {
		this.dialogView = Blaze.render(Template.vrecDialog, document.body);
	}

	open(source, { rid, tmid }) {
		if (!this.dialogView) {
			this.init();
		}

		if (!window.MediaRecorder.isTypeSupported('video/webm; codecs=vp8,opus')) {
			dispatchToastMessage({ type: 'error', message: t('Browser_does_not_support_recording_video') });
			return;
		}

		this.dialogView.templateInstance().update({
			rid,
			tmid,
			input: source.querySelector('.js-input-message'),
		});

		this.source = source;
		const dialog = $('.vrec-dialog');
		this.dialogView.templateInstance().setPosition(dialog, source);
		dialog.addClass('show');
		this.opened = true;

		return this.initializeCamera();
	}

	close() {
		$('.vrec-dialog').removeClass('show');
		this.opened = false;
		if (this.video != null) {
			return VideoRecorder.stop();
		}
	}

	initializeCamera() {
		this.video = $('.vrec-dialog video').get('0');
		if (!this.video) {
			return;
		}
		return VideoRecorder.start(this.video);
	}
})();
