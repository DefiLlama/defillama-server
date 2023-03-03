import { AdapterResult } from "../../types/adapters";
import { manualCliff, manualLinear } from "../manual";
import { parseDateString } from "../../utils/time";
const eulerSchedule = [
  {
    Epoch: 0,
    "Approx Date": "21/03/2022",
    "EUL Distribution": "271,828.18",
  },
  {
    Epoch: 1,
    "Approx Date": "04/04/2022",
    "EUL Distribution": "36,915.69",
  },
  {
    Epoch: 2,
    "Approx Date": "18/04/2022",
    "EUL Distribution": "37,673.39",
  },
  {
    Epoch: 3,
    "Approx Date": "02/05/2022",
    "EUL Distribution": "38,531.30",
  },
  {
    Epoch: 4,
    "Approx Date": "16/05/2022",
    "EUL Distribution": "39,501.78",
  },
  {
    Epoch: 5,
    "Approx Date": "30/05/2022",
    "EUL Distribution": "40,598.43",
  },
  {
    Epoch: 6,
    "Approx Date": "13/06/2022",
    "EUL Distribution": "41,836.14",
  },
  {
    Epoch: 7,
    "Approx Date": "27/06/2022",
    "EUL Distribution": "43,231.14",
  },
  {
    Epoch: 8,
    "Approx Date": "11/07/2022",
    "EUL Distribution": "44,800.97",
  },
  {
    Epoch: 9,
    "Approx Date": "25/07/2022",
    "EUL Distribution": "46,564.39",
  },
  {
    Epoch: 10,
    "Approx Date": "08/08/2022",
    "EUL Distribution": "48,541.27",
  },
  {
    Epoch: 11,
    "Approx Date": "22/08/2022",
    "EUL Distribution": "50,752.38",
  },
  {
    Epoch: 12,
    "Approx Date": "05/09/2022",
    "EUL Distribution": "53,219.03",
  },
  {
    Epoch: 13,
    "Approx Date": "19/09/2022",
    "EUL Distribution": "55,962.62",
  },
  {
    Epoch: 14,
    "Approx Date": "03/10/2022",
    "EUL Distribution": "59,004.03",
  },
  {
    Epoch: 15,
    "Approx Date": "17/10/2022",
    "EUL Distribution": "62,362.78",
  },
  {
    Epoch: 16,
    "Approx Date": "31/10/2022",
    "EUL Distribution": "66,056.03",
  },
  {
    Epoch: 17,
    "Approx Date": "14/11/2022",
    "EUL Distribution": "70,097.30",
  },
  {
    Epoch: 18,
    "Approx Date": "28/11/2022",
    "EUL Distribution": "55000",
  },
  {
    Epoch: 19,
    "Approx Date": "12/12/2022",
    "EUL Distribution": "55000",
  },
  {
    Epoch: 20,
    "Approx Date": "26/12/2022",
    "EUL Distribution": "55000",
  },
  {
    Epoch: 21,
    "Approx Date": "09/01/2023",
    "EUL Distribution": "55000",
  },
  {
    Epoch: 22,
    "Approx Date": "23/01/2023",
    "EUL Distribution": "55000",
  },
  {
    Epoch: 23,
    "Approx Date": "06/02/2023",
    "EUL Distribution": "55000",
  },
  {
    Epoch: 24,
    "Approx Date": "20/02/2023",
    "EUL Distribution": "52000",
  },
  {
    Epoch: 25,
    "Approx Date": "06/03/2023",
    "EUL Distribution": "52000",
  },
  {
    Epoch: 26,
    "Approx Date": "20/03/2023",
    "EUL Distribution": "52000",
  },
  {
    Epoch: 27,
    "Approx Date": "03/04/2023",
    "EUL Distribution": "52000",
  },
  {
    Epoch: 28,
    "Approx Date": "17/04/2023",
    "EUL Distribution": "52000",
  },
  {
    Epoch: 29,
    "Approx Date": "01/05/2023",
    "EUL Distribution": "52000",
  },
  {
    Epoch: 30,
    "Approx Date": "15/05/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 31,
    "Approx Date": "29/05/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 32,
    "Approx Date": "12/06/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 33,
    "Approx Date": "26/06/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 34,
    "Approx Date": "10/07/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 35,
    "Approx Date": "24/07/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 36,
    "Approx Date": "07/08/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 37,
    "Approx Date": "21/08/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 38,
    "Approx Date": "04/09/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 39,
    "Approx Date": "18/09/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 40,
    "Approx Date": "02/10/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 41,
    "Approx Date": "16/10/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 42,
    "Approx Date": "30/10/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 43,
    "Approx Date": "13/11/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 44,
    "Approx Date": "27/11/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 45,
    "Approx Date": "11/12/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 46,
    "Approx Date": "25/12/2023",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 47,
    "Approx Date": "08/01/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 48,
    "Approx Date": "22/01/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 49,
    "Approx Date": "05/02/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 50,
    "Approx Date": "19/02/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 51,
    "Approx Date": "04/03/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 52,
    "Approx Date": "18/03/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 53,
    "Approx Date": "01/04/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 54,
    "Approx Date": "15/04/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 55,
    "Approx Date": "29/04/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 56,
    "Approx Date": "13/05/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 57,
    "Approx Date": "27/05/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 58,
    "Approx Date": "10/06/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 59,
    "Approx Date": "24/06/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 60,
    "Approx Date": "08/07/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 61,
    "Approx Date": "22/07/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 62,
    "Approx Date": "05/08/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 63,
    "Approx Date": "19/08/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 64,
    "Approx Date": "02/09/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 65,
    "Approx Date": "16/09/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 66,
    "Approx Date": "30/09/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 67,
    "Approx Date": "14/10/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 68,
    "Approx Date": "28/10/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 69,
    "Approx Date": "11/11/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 70,
    "Approx Date": "25/11/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 71,
    "Approx Date": "09/12/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 72,
    "Approx Date": "23/12/2024",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 73,
    "Approx Date": "06/01/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 74,
    "Approx Date": "20/01/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 75,
    "Approx Date": "03/02/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 76,
    "Approx Date": "17/02/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 77,
    "Approx Date": "03/03/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 78,
    "Approx Date": "17/03/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 79,
    "Approx Date": "31/03/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 80,
    "Approx Date": "14/04/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 81,
    "Approx Date": "28/04/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 82,
    "Approx Date": "12/05/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 83,
    "Approx Date": "26/05/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 84,
    "Approx Date": "09/06/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 85,
    "Approx Date": "23/06/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 86,
    "Approx Date": "07/07/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 87,
    "Approx Date": "21/07/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 88,
    "Approx Date": "04/08/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 89,
    "Approx Date": "18/08/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 90,
    "Approx Date": "01/09/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 91,
    "Approx Date": "15/09/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 92,
    "Approx Date": "29/09/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 93,
    "Approx Date": "13/10/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 94,
    "Approx Date": "27/10/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 95,
    "Approx Date": "10/11/2025",
    "EUL Distribution": "47000",
  },
  {
    Epoch: 96,
    "Approx Date": "24/11/2025",
    "EUL Distribution": "47000",
  },
];

function main(totalQty: number): AdapterResult[] {
  let start: string = "26/11/2021";
  let workingQty: number = 0;
  const sections: AdapterResult[] = [];

  eulerSchedule.map((e: any) => {
    const qty = Number(e["EUL Distribution"].replace(/,/g, ""));
    sections.push(
      manualLinear(
        parseDateString(start),
        parseDateString(e["Approx Date"]),
        qty,
      ),
    );
    start = e["Approx Date"];
    workingQty += qty;
  });
  if (workingQty < totalQty)
    sections.push(manualCliff(parseDateString(start), totalQty - workingQty));
  return sections;
}
const euler = main(6_795_705);
export default euler;
