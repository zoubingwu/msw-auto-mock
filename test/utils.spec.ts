import { describe, expect, it } from 'vitest';

import { isValidRegExp, toExpressLikePath } from '../src/utils';

describe('utils:toExpressLikePath', () => {
  it('should transform to express like path', () => {
    expect(toExpressLikePath('/a/b/{c_d}')).toEqual('/a/b/:cD');
    expect(toExpressLikePath('/{a}/{b}/{c}')).toEqual('/:a/:b/:c');
  });
});

describe('utils:isValidRegExp', () => {
  it('test cases', () => {
    [
      ['/^S+@S+.S+$/', true],
      ['employ(|er|ee|ment|ing|able)', true],
      ['[a-f0-9]{32}', true],
      ['[A-Fa-f0-9]{64}', true],
      ['^[0-9]{2,6}.[0-9]{5}$', true],
      ['<tag>[^<]*</tag>', true],
      ['aaaaaaaaaaaaaaaa', true],
      ['\\', false],
    ].forEach(([i, o]) => {
      expect(isValidRegExp(i as string)).toBe(o);
    });
  });
});
