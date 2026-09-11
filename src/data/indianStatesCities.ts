/**
 * Official Indian States and Real Cities / District Headquarters
 * Source: Government of India / Census of India District Headquarters
 * Supports dynamic API fetching from CountriesNow API with caching and instant real data fallback.
 */

const REAL_INDIAN_CITIES_BY_STATE: Record<string, string[]> = {
  "Andhra Pradesh": [
    "Anantapur", "Bhimavaram", "Chittoor", "Eluru", "Guntur", "Kadapa", "Kakinada",
    "Kurnool", "Machilipatnam", "Nandyal", "Nellore", "Ongole", "Proddatur",
    "Rajahmundry", "Srikakulam", "Tenali", "Tirupati", "Vijayawada", "Visakhapatnam",
    "Vizianagaram", "Adoni", "Madanapalle", "Hindupur", "Guntakal", "Dharmavaram",
    "Gudivada", "Narasaraopet", "Tadipatri", "Mangalagiri", "Chilakaluripet"
  ],
  "Arunachal Pradesh": [
    "Itanagar", "Naharlagun", "Pasighat", "Tawang", "Ziro", "Along", "Tezu",
    "Bomdila", "Roing", "Khonsa", "Changlang", "Seppa", "Namsai", "Daporijo"
  ],
  "Assam": [
    "Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur",
    "Bongaigaon", "Karimganj", "Sivasagar", "Goalpara", "Barpeta", "Dhubri",
    "North Lakhimpur", "Diphu", "Golaghat", "Hailakandi", "Mangaldai", "Haflong"
  ],
  "Bihar": [
    "Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif",
    "Arrah", "Begusarai", "Katihar", "Munger", "Chhapra", "Danapur", "Saharsa",
    "Sasaram", "Hajipur", "Dehri", "Siwan", "Motihari", "Nawada", "Bagaha",
    "Buxar", "Kishanganj", "Sitamarhi", "Jamalpur", "Jehanabad", "Aurangabad"
  ],
  "Chhattisgarh": [
    "Raipur", "Bhilai", "Bilaspur", "Korba", "Rajnandgaon", "Raigarh", "Jagdalpur",
    "Ambikapur", "Dhamtari", "Chirmiri", "Mahasamund", "Kanker", "Durg",
    "Bhatapara", "Dalli-Rajhara", "Kawardha", "Naila Janjgir"
  ],
  "Goa": [
    "Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda", "Bicholim", "Curchorem",
    "Cuncolim", "Valpoi", "Sanquelim", "Canacona", "Pernem"
  ],
  "Gujarat": [
    "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh",
    "Gandhinagar", "Gandhidham", "Anand", "Navsari", "Morbi", "Nadiad", "Surendranagar",
    "Bharuch", "Mehsana", "Bhuj", "Porbandar", "Palanpur", "Valsad", "Vapi",
    "Gondal", "Veraval", "Godhra", "Patan", "Kalol", "Dahod", "Botad", "Amreli"
  ],
  "Haryana": [
    "Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar",
    "Karnal", "Sonipat", "Panchkula", "Bhiwani", "Sirsa", "Bahadurgarh", "Jind",
    "Thanesar", "Kaithal", "Rewari", "Palwal", "Hansi", "Narnaul", "Fatehabad"
  ],
  "Himachal Pradesh": [
    "Shimla", "Dharamshala", "Mandi", "Solan", "Kullu", "Manali", "Bilaspur",
    "Chamba", "Hamirpur", "Una", "Nahan", "Palampur", "Baddi", "Paonta Sahib", "Sundarnagar"
  ],
  "Jharkhand": [
    "Ranchi", "Jamshedpur", "Dhanbad", "Bokaro Steel City", "Deoghar", "Phusro",
    "Hazaribagh", "Giridih", "Ramgarh", "Medininagar", "Chirkunda", "Chaibasa",
    "Dumka", "Sahibganj", "Jhumri Telaiya", "Gumia", "Madhupur"
  ],
  "Karnataka": [
    "Bengaluru", "Mysuru", "Hubballi-Dharwad", "Mangaluru", "Belagavi", "Kalaburagi",
    "Davanagere", "Ballari", "Vijayapura", "Shivamogga", "Tumakuru", "Raichur",
    "Bidar", "Hosapete", "Gadag-Betageri", "Udupi", "Hassan", "Bhadravati",
    "Chitradurga", "Kolar", "Mandya", "Chikkamagaluru", "Bagalkote", "Gangavathi"
  ],
  "Kerala": [
    "Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur", "Kannur",
    "Alappuzha", "Kottayam", "Palakkad", "Manjeri", "Thalassery", "Thiruvalla",
    "Ponnani", "Vatakara", "Kanhangad", "Payyanur", "Koyilandy", "Kasaragod", "Malappuram"
  ],
  "Madhya Pradesh": [
    "Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna",
    "Ratlam", "Rewa", "Katni", "Singrauli", "Burhanpur", "Khandwa", "Bhind",
    "Chhindwara", "Guna", "Shivpuri", "Vidisha", "Damoh", "Mandsaur", "Khargone",
    "Neemuch", "Pithampur", "Hoshangabad", "Itarsi", "Sehore", "Morena"
  ],
  "Maharashtra": [
    "Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Kalyan-Dombivli", "Vasai-Virar",
    "Aurangabad (Chhatrapati Sambhaji Nagar)", "Navi Mumbai", "Solapur", "Mira-Bhayandar",
    "Bhiwandi", "Amravati", "Nanded", "Kolhapur", "Akola", "Panvel", "Ulhasnagar",
    "Sangli-Miraj", "Malegaon", "Jalgaon", "Latur", "Dhule", "Ahmednagar", "Chandrapur",
    "Parbhani", "Ichalkaranji", "Jalna", "Ambarnath", "Bhusawal", "Satara", "Beed", "Yavatmal"
  ],
  "Manipur": [
    "Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Kakching", "Senapati",
    "Ukhrul", "Tamenglong", "Chandel", "Jiribam"
  ],
  "Meghalaya": [
    "Shillong", "Tura", "Jowai", "Nongpoh", "Williamnagar", "Baghmara", "Resubelpara", "Mairang", "Cherrapunji"
  ],
  "Mizoram": [
    "Aizawl", "Lunglei", "Saiha", "Champhai", "Kolasib", "Serchhip", "Lawngtlai", "Mamit"
  ],
  "Nagaland": [
    "Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Zunheboto", "Mon", "Phek", "Chümoukedima"
  ],
  "Odisha": [
    "Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore",
    "Bhadrak", "Baripada", "Jharsuguda", "Jeypore", "Bargarh", "Rayagada",
    "Bolangir", "Dhenkanal", "Kendujhar", "Angul", "Jajpur", "Paradeep"
  ],
  "Punjab": [
    "Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Hoshiarpur",
    "Mohali", "Batala", "Pathankot", "Moga", "Abohar", "Malerkotla", "Khanna",
    "Phagwara", "Muktsar", "Barnala", "Rajpura", "Firozpur", "Kapurthala"
  ],
  "Rajasthan": [
    "Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar",
    "Bharatpur", "Sri Ganganagar", "Sikar", "Pali", "Barmer", "Tonk", "Kishangarh",
    "Beawar", "Hanumangarh", "Dholpur", "Sawai Madhopur", "Churu", "Jhunjhunu", "Baran", "Chittorgarh"
  ],
  "Sikkim": [
    "Gangtok", "Namchi", "Gyalshing", "Mangan", "Singtam", "Rangpo", "Jorethang", "Ravangla"
  ],
  "Tamil Nadu": [
    "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli",
    "Tiruppur", "Ranipet", "Nagercoil", "Thanjavur", "Vellore", "Kancheepuram",
    "Erode", "Tiruvannamalai", "Pollachi", "Rajapalayam", "Sivakasi", "Pudukkottai",
    "Neyveli", "Nagapattinam", "Viluppuram", "Dindigul", "Cuddalore", "Kumbakonam", "Hosur", "Karur"
  ],
  "Telangana": [
    "Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Ramagundam",
    "Mahabubnagar", "Nalgonda", "Adilabad", "Suryapet", "Miryalaguda", "Siddipet",
    "Jagtial", "Mancherial", "Nirmal", "Kamareddy", "Kothagudem", "Bodhan",
    "Palwancha", "Mandamarri", "Tandur", "Gadwal", "Wanaparthy", "Bhongir", "Sangareddy", "Vikarabad", "Medak"
  ],
  "Tripura": [
    "Agartala", "Dharmanagar", "Udaipur", "Kailashahar", "Belonia", "Khowai", "Teliamura", "Ambassa"
  ],
  "Uttar Pradesh": [
    "Lucknow", "Kanpur", "Ghaziabad", "Agra", "Meerut", "Varanasi", "Prayagraj",
    "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Noida",
    "Firozabad", "Jhansi", "Muzaffarnagar", "Mathura", "Budaun", "Rampur",
    "Shahjahanpur", "Farrukhabad", "Ayodhya", "Hapur", "Etawah", "Mirzapur",
    "Bulandshahr", "Sambhal", "Amroha", "Hardoi", "Fatehpur", "Raebareli", "Orai", "Sitapur", "Bahraich"
  ],
  "Uttarakhand": [
    "Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh",
    "Kotdwar", "Pithoragarh", "Manglaur", "Ramnagar", "Nainital", "Mussoorie", "Tehri"
  ],
  "West Bengal": [
    "Kolkata", "Howrah", "Asansol", "Siliguri", "Durgapur", "Bardhaman", "Malda",
    "Baharampur", "Habra", "Kharagpur", "Shantipur", "Dankuni", "Dhulian", "Ranaghat",
    "Haldia", "Raiganj", "Krishnanagar", "Nabadwip", "Midnapore", "Jalpaiguri", "Balurghat", "Bankura", "Darjeeling"
  ],
  "Andaman and Nicobar Islands": [
    "Port Blair", "Diglipur", "Mayabunder", "Rangat", "Car Nicobar", "Havelock Island"
  ],
  "Chandigarh": [
    "Chandigarh"
  ],
  "Dadra and Nagar Haveli and Daman and Diu": [
    "Daman", "Diu", "Silvassa"
  ],
  "Delhi (NCT)": [
    "New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi",
    "Central Delhi", "North East Delhi", "North West Delhi", "South East Delhi", "South West Delhi", "Shahdara"
  ],
  "Jammu and Kashmir": [
    "Srinagar", "Jammu", "Anantnag", "Baramulla", "Kathua", "Sopore", "Udhampur",
    "Punch", "Rajouri", "Kupwara", "Ganderbal", "Budgam", "Pulwama", "Kulgam"
  ],
  "Ladakh": [
    "Leh", "Kargil", "Diskit", "Padum"
  ],
  "Lakshadweep": [
    "Kavaratti", "Agatti", "Amini", "Andrott", "Minicoy"
  ],
  "Puducherry": [
    "Puducherry", "Karaikal", "Yanam", "Mahe", "Ozhukarai"
  ],
};

const citiesCache = new Map<string, string[]>();

/**
 * Returns real cities for a given Indian State synchronously from verified dataset.
 */
export function getCitiesForState(stateName: string): string[] {
  if (!stateName) return [];

  // Match state ignoring extra spaces or case
  const normalizedKey = Object.keys(REAL_INDIAN_CITIES_BY_STATE).find(
    (key) => key.toLowerCase() === stateName.trim().toLowerCase()
  );

  const list = normalizedKey ? REAL_INDIAN_CITIES_BY_STATE[normalizedKey] : [];
  return [...list].sort((a, b) => a.localeCompare(b));
}

/**
 * Asynchronously fetches cities for an Indian state from public API with instant fallback to verified data.
 */
export async function fetchCitiesForState(stateName: string): Promise<string[]> {
  const fallback = getCitiesForState(stateName);
  if (!stateName) return [];

  const cacheKey = stateName.trim().toLowerCase();
  if (citiesCache.has(cacheKey)) {
    return citiesCache.get(cacheKey)!;
  }

  // Pre-seed cache with genuine verified cities
  citiesCache.set(cacheKey, fallback);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country: "India",
        state: stateName.replace(/\s*\(.*?\)\s*/g, "").trim(), // Strip parentheticals like (NCT)
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.data) && json.data.length > 0) {
        // Clean diacritics / normalize formatting
        const cleanList = json.data
          .map((item: string) =>
            item
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "") // strip diacritics
              .trim()
          )
          .filter((c: string) => c.length > 1);

        // Union with verified district headquarters
        const combined = Array.from(new Set([...fallback, ...cleanList])).sort((a, b) =>
          a.localeCompare(b)
        );

        citiesCache.set(cacheKey, combined);
        return combined;
      }
    }
  } catch {
    // Graceful fallback to verified genuine districts
  }

  return fallback;
}

export const ALL_INDIAN_STATES = Object.keys(REAL_INDIAN_CITIES_BY_STATE);
