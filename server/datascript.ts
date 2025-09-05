// expr: anything that evaluates to one or more scalar value

/*

    
    Person(name, age)
    Person(name2, age)

    var: p, p2, age, name, name2, plusOne
    type(age) == Person.age, type(p) == Person, type(p2) == Person
    entity(age) == p, entity(age) == p2, p1 != p2
    type(name) == Person.name, type(name2) == Person.name
    plusOne = age + 1

    age = 16, p = #1, p2 = #3, name = "jason", name2 = "wojak"
    age = 16, p = #3, p2 = #1, name = "wojak", name2 = "jason"

    U = { #1, #2, #3, 16, 17, 18, Person, Person.age, Type }

    // for all types, get all values that belong to that type

    q(type, value) = 
        Type(type) = Type
        Type(value) = type

    q(Person.age, ?) = {
        (Person.age, 16),
        (Person.age, 17),
    }

    q(?,?) = {
        (Type, Type),
        (Type, Person)
        (Type, Person.age),
        (Person.age, 16),
        (Person.age, 17),
        (Person, #1)
        (Person, #2)
        (Person, #3)
    }

    Type = {
        (value=Type, type=Type),
        (Person, Type), (Person.age, Type),
        (#1, Person)
        (#2, Person)
        (#3, Person)
        (16, Person.age)
        (17, Person.age)
    }
    Entity = {
        (value=16, id=#1),
        (value=16, id=#2),
        (value=17, id=#3)
    }
    SameAge = {| p, p2, age |} | 
        forall p, p2, age
        type(p) = Person, type(p2) = Person, type(age) = Person.age
        entity(age) = p, entity(age) = p2, p != p2
    

    assume p = #1, p = #3
        # eliminated: Person = Person, Person = Person, #1 != #2
    entity(age) = #1, entity(age) = #2, type(age) = Person.age

    assume age = 16
        # eliminated: Person.age = Person.age
    (#1 | #2) = #1, (#1 | #2) = #2,
    (#1) = #1, (#1) = #2, # false
    (#2) = #1, (#2) = #2, # false
    (#2) = #1, (#1) = #2, # false
    (#1) = #1, (#2) = #2, # true
    
    possibilities: 
        #1 = #1, #2 = #2


    entities = {
        (16, #1)
        (17, #2)
        (16, #3)
        ("jason", #3)
        ("nosaj", #3)
        ("wojak", #3)
    }

    
    var name, id, p
    type(name) == Person.name
    type(id) == Person.id
    entity(name) == p
    entity(id) = p


    entities = {
       ("jason", p)
       (1, p)
    }

    types = {
       (p, Person),
       ("jason", Person.name),
       (1, Person.id)
    }

   vars
   person, name, personId, postAuthor, postId
   conditions
   type(person, Person)
   eq(name, ref(person, name))
   eq(personId, ref(Person, id))

   eq(y, ref(Post, author))
   eq()
   eq(z, 0)

*/

// type Relation<F extends Record<string, any>> =
//   | BaseRelation<F>
//   | DerivedRelation<F>;

/*

Asserted multisets:
U = { #symbols .... }
String = { #a, #b, ... }
Boolean = { #true, #false }
Number = { #1, #2, ... }
// the set of all symbols in the universe to the set they were asserted to?
Type = { 
    {| #Type, #Type |}
    {| #String, #Type |}
    {| #Person, #Type |}
    {| #a, #String |}
    ...
}



*/

/* def TypesAndValues = {
    r where
    forall type, value, r = {| type, value |}, r : TypesMultiset
}
*/

// vars
// person, name, personId, postAuthor, postId
// conditions
// type(person, Person)
// eq(name, ref(person, name))
// eq(personId, ref(Person, id))

/*

PersonAge = {  {| age = 17, person = "1" |}, {| age = 17, person = "2" |},  {| age = 18, person = "3" |} }
Person = { "1", "2" }

sameAgedPersonPair = r |
  forall r, p1, p2
  p1 : PersonAge, p2 : PersonAge, p1.person != p2.person, p1.age = p2.age
  r.age = p1.age, r.p1 = p1.person, r.p2 = p2.person

select 

  
  


# expected:
sameAgedPersonPair = {
  {| age = 17, p1 = "1", p2 = "2" |}
  {| age = 17, p1 = "2", p2 = "1" |}
}

  */
/*

# asserted
A = { 1, 2, 3 }
# computed
B = { x | forall x, x = 1 or x = 2 or x = 3 }
C = { x | forall x, x : B }

O = { {|a, b|} | bool(a) and num(b) }
O = { x | somePred(x) }

// functions only ever return a single value
plusOne(a) = a + 1
# unique({| value, Set |}) = exists(y | y : Set and value == y) 

// predicates are functions that return a boolean
somePred(x) = true

*/
class SetReference<T extends Datatype> {
  __contains!: T;
}

type Primitive = string | boolean | number | SetReference<Datatype>;
type Row = Record<string, Primitive>;
type Datatype = Primitive | Row;

// type Expr<T = Datatype> = Var<T> | Constant<T> | Func<T>
type Multiset<T extends Datatype> =
  | AssertedMultiset<T>
  | ConstructedMultiset<T>;

abstract class Expr<T extends Datatype> {
  __type!: T;
}

// defined by its object equality
// type Var<T> = { kind: "var"; __type: T };

// type Constant<T> = { kind: "const"; value: T };

// maps each possible values of a variable (the set it ranges over) to a single other value
class ValueFunc<T extends Datatype> extends Expr<T> {
  constructor(
    public name: string, // such as eq, gt, lt, upper, lower, etc.
    public args: Expr<Datatype>[]
  ) {
    super();
  }
}

// aggregates get all the possible values of a variable (the set it ranges over) and crunches them into a scalar value
abstract class AggregateFunc<T extends Datatype> extends Expr<T> {
  constructor(
    public name: string,
    public args: Expr<Datatype>[]
  ) {
    super();
  }
}

class Count extends AggregateFunc<number> {
  constructor(public value: Expr<Datatype>) {
    super("count", [value]);
  }
}

class Constant<T extends Datatype> extends Expr<T> {
  constructor(public value: T) {
    super();
  }
}

class Var<T extends Datatype> extends Expr<T> {}

// type AssertedMultiset<T extends Datatype> = { name: string } & SetReference<T>;

class AssertedMultiset<T extends Datatype> extends SetReference<T> {
  constructor(public name: string) {
    super();
  }
}

class ConstructedMultiset<T extends Datatype> extends SetReference<T> {
  constructor(
    public head: Expr<T>,
    public variables: Var<Datatype>[],
    public constraints: Expr<boolean>[]
  ) {
    super();
  }
}

// type ConstructedMultiset<T extends Datatype> = {
//     head: Expr<T>;
//     variables: Var<Datatype>[];
//     constraints: Expr<boolean>[];
//   } & SetReference<T>;

// limit?: number;
// offset?: number;
// distinct?: true;
// orderBy?: { expr: Expr<Datatype>; direction: "asc" | "desc" }[];
// groupB


// question, where can new variables be introduced?
// (they are the equivalent of sql from)

const Type = new AssertedMultiset<{ value: any; type: string }>("Type");

const Person = new AssertedMultiset<string>("Person");

const PersonAge = new AssertedMultiset<{ age: number; person: string }>(
  "PersonAge"
);

const x = new Var<string>();
const pplaage = new ConstructedMultiset(
    new Count(x), 
    [x], 
    [
        new ValueFunc<boolean>("in", [x, new Constant(Person)]),
        
    ]
);
