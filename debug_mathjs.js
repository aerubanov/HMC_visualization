import { parse } from 'mathjs';

const exprs = ['sin(x) + cos(y)', 'x * y + z', 'exp(x)', 'myFunc(x)', 'pi * x'];

exprs.forEach((expr) => {
  console.log(`\nExpression: ${expr}`);
  const node = parse(expr);
  node.traverse((n) => {
    if (n.isSymbolNode) {
      console.log(`Symbol: ${n.name}`);
    }
    if (n.isFunctionNode) {
      console.log(`Function Call: ${n.fn.name}`);
    }
  });
});
