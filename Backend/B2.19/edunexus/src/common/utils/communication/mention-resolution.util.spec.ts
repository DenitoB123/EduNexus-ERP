import { MentionResolutionUtil } from './mention-resolution.util';

describe('MentionResolutionUtil', () => {
  it('extracts unique @handles from content', () => {
    const handles = MentionResolutionUtil.extractHandles('Hey @alice.smith, loop in @bob and @alice.smith again');
    expect(handles.sort()).toEqual(['alice.smith', 'bob']);
  });

  it('returns an empty array when there are no mentions', () => {
    expect(MentionResolutionUtil.extractHandles('no mentions here')).toEqual([]);
  });

  it('resolves handles to participant IDs using the supplied map, dropping unknown handles', () => {
    const resolved = MentionResolutionUtil.resolveParticipantIds('cc @alice.smith and @unknown', {
      'alice.smith': 'participant-1',
    });
    expect(resolved).toEqual(['participant-1']);
  });
});
