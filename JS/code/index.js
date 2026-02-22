// 'use strict'

// function show() {
//   console.log(this);
// }

// show();

// const val1 = 10
// let val2 = val1

// console.log(val1)
// console.log(val2)

// val2 = 20

// console.log(val1)
// console.log(val2)

// const a = { a: 'CLMM' }
// console.log(a.toString());

// console.log('1');                    // sync
// setTimeout(() => console.log('2'), 0);  // macrotask
// Promise.resolve().then(() => console.log('3'));  // microtask
// console.log('4'); 

// function Animal(name) {
//   this.name = name
// }

// Animal.prototype.speak = function () {
//   console.log(this.name + ' speak!')
// }

// // function Dog(name) {
// //   this.name = name
// // }

// // Dog.prototype = Object.create(Animal.prototype)
// // Dog.prototype.constructor = Dog

// const animal = new Animal('Animal')
// const animal2 = Animal('Animal2')
// // const dog = new Dog('Dog')

// animal.speak()
// // animal2.speak()
// // dog.speak()
// console.log(global)

// console.log(b)
// let b = 10
// console.log(b)

'use strict'
function show() {
  console.log(this);
}
show();