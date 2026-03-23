import { sluggifyString } from './sluggify';

const tests: Record<string, string> = {
  've(3,3)': 've33',
  'Prediction Market': 'prediction-market',
};

test("should get correct slug string", () => {
  Object.keys(tests).forEach(t => expect(sluggifyString(t)).toEqual(tests[t])) 
})
