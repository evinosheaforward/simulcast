import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

export const randomName = (n: number = 2) => {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals], // three dictionaries of words
    separator: "-", // use '-' to join words
    length: n, // number of words
  });
};
