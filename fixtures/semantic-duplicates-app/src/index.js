export function greet(name) {
  return `Hi, ${name}!`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(greet("world"));
}
