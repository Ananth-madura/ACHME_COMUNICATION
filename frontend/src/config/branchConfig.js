export const BRANCH_DATA = {
  "Coimbatore": {
    address: "Opp to SMS Hotel, Peelamedu, Avinashi Road, Coimbatore-641004",
    gstin: "33AAHFA7876M1ZX"
  },
  "Bangalore": {
    address: "14th Main Road, GK Layout, Electronic City Post, Bangalore-560100",
    gstin: "29AAHFA7876M1ZM"
  },
  "Chennai": {
    address: "5th Floor, 5CD PM Towers, Dreams Road, Thousand Lights, Chennai-600006",
    gstin: "33AAHFA7876M1ZX"
  }
};

export const BRANCH_OPTIONS = Object.keys(BRANCH_DATA).map(v => ({
  value: v,
  label: v,
  state: v === "Bangalore" ? "Karnataka" : "Tamil Nadu"
}));

export const BANK_DETAILS = [
  { id: "hdfc", company: "ACHME COMMUNICATION", bank: "HDFC BANK", account: "00312320005822", ifsc: "HDFC0000031", branch: "Coimbatore" },
  { id: "kotak", company: "Achme Communication", bank: "KOTAK MAHINDRA BANK", account: "9211242667", ifsc: "KKBK0000491", branch: "Avinashi Road, Coimbatore" }
];

export const BRANCH_ADDRESS_OPTIONS = [
  { value: "Coimbatore", label: "Coimbatore" },
  { value: "Bangalore", label: "Bangalore" },
  { value: "Chennai", label: "Chennai" }
];