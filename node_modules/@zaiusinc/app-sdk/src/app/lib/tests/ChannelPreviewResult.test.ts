import 'jest';

import {ChannelPreviewResult} from '../ChannelPreviewResult';

describe('ChannelPreviewResult', () => {
  describe('addError', () => {
    it('adds errors for specific fields', () => {
      const result = new ChannelPreviewResult()
        .addError('settings', 'sender', 'name', 'Cannot be blank')
        .addError('template', 'message', 'title', 'Must be less than 50 characters')
        .addError('template', 'message', 'title', 'Cannot contain special characters');
      expect(result['errors']).toEqual({
        'settings.sender.name': ['Cannot be blank'],
        'template.message.title': ['Must be less than 50 characters', 'Cannot contain special characters']
      });
    });
  });

  describe('getResponse', () => {
    it('produces a response with previews and no errors or toasts', () => {
      expect(new ChannelPreviewResult(['Message 1', 'Message 2']).getResponse()).toEqual({
        previews: ['Message 1', 'Message 2'],
        errors: {},
        toasts: []
      });
    });

    it('produces a fallback toast when no information is provided', () => {
      expect(new ChannelPreviewResult().getResponse()).toEqual({
        previews: [],
        errors: {},
        toasts: [{intent: 'danger', message: 'Failed to generate preview'}]
      });
    });

    it('includes errors and toasts in the response', () => {
      const result = new ChannelPreviewResult()
        .addError('template', 'message', 'title', 'Must be less than 50 characters')
        .addToast('danger', 'Preview failed');
      expect(result.getResponse()).toEqual({
        previews: [],
        errors: {'template.message.title': ['Must be less than 50 characters']},
        toasts: [{intent: 'danger', message: 'Preview failed'}]
      });
    });
  });
});
