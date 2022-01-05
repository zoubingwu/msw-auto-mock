import { describe, expect, it } from 'vitest';

import { toExpressLikePath } from '../src/utils';

describe('utils:toExpressLikePath', () => {
  it('should transform to express like path', () => {
    expect(toExpressLikePath('/a/b/{c_d}')).toEqual('/a/b/:cD');
    expect(toExpressLikePath('/{a}/{b}/{c}')).toEqual('/:a/:b/:c');
  });
});
