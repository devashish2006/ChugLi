const adjectives = [
  "Silent",
  "Blue",
  "Hidden",
  "Curious",
  "Night",
  "Lazy",
  "Angry",
  "Lost",
];

const animals = [
  "Fox",
  "Owl",
  "Cat",
  "Wolf",
  "Tiger",
  "Panda",
  "Crow",
  "Turtle",
];

export function generateAnonymousName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adj} ${animal}`;
}
