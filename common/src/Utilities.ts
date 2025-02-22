import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

export const randomName = () => {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals], // three dictionaries of words
    separator: "-", // use '-' to join words
    length: 2, // number of words
  });
};
