export const toExpressLikePath = (path: string) => {
  return path.replace(/{(.+?)}/g, ':$1'); // use `.+?` for lazy match
};
