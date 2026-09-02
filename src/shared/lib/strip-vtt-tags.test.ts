import { describe, expect, it } from 'vitest';
import { stripVttTags } from './strip-vtt-tags';

describe('stripVttTags', () => {
  it('removes voice tag and preserves speaker', () => {
    expect(stripVttTags('<v Speaker 0>Hello')).toBe('Speaker 0: Hello');
  });

  it('strips voice class variants', () => {
    expect(stripVttTags('<v Roger.loud>Hello')).toBe('Roger: Hello');
    expect(stripVttTags('<v.loud Roger>Hello')).toBe('Roger: Hello');
  });

  it('removes formatting tags', () => {
    expect(stripVttTags('<c.colorCCCCCC>Hello <i>world</i></c>')).toBe('Hello world');
    expect(stripVttTags('<b>Bold</b> and <u>underline</u>')).toBe('Bold and underline');
  });

  it('decodes entities', () => {
    expect(stripVttTags('Tom &amp; Jerry &lt;3')).toBe('Tom & Jerry <3');
  });

  it('removes timestamp tags', () => {
    expect(stripVttTags('Hello <00:01:00.000>world')).toBe('Hello world');
  });

  it('handles empty voice tag', () => {
    expect(stripVttTags('<v>Silence')).toBe('Silence');
  });
});
