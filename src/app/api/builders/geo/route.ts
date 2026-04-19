import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Country normaliser — maps messy location strings to ISO 3166-1 alpha-2 codes
// Returns { code, name } or null if no match
function normaliseLocation(raw: string | null): { code: string; name: string } | null {
  if (!raw) return null
  const s = raw.toLowerCase().trim().replace(/\s+/g, ' ')
  if (!s || s === 'null' || s === 'remote') return null

  // Order matters — check specific strings before generic substring matches
  const patterns: Array<[RegExp, string, string]> = [
    // USA — many variants
    [/\b(united states|usa|u\.s\.a|u\.s\.|america)\b/, 'US', 'USA'],
    [/\b(san jose|san francisco|austin|dallas|new york|nyc|nyc|seattle|boston|chicago|atlanta|miami|los angeles|california|texas|florida)\b/, 'US', 'USA'],
    [/,\s*(ca|ny|tx|fl|wa|ma|il|ga|nc|va|or|co|az|nj|pa|oh|mi|mn|md)\b/, 'US', 'USA'],
    // UK
    [/\b(united kingdom|uk|england|scotland|wales|northern ireland|london|manchester|edinburgh|glasgow|birmingham)\b/, 'GB', 'UK'],
    // Spain
    [/\b(spain|españa|barcelona|madrid|palma|valencia|sevilla|seville|bilbao)\b/, 'ES', 'Spain'],
    // Germany
    [/\b(germany|deutschland|berlin|munich|münchen|hamburg|frankfurt|cologne|köln)\b/, 'DE', 'Germany'],
    // France
    [/\b(france|paris|lyon|marseille|toulouse|nice|bordeaux)\b/, 'FR', 'France'],
    // Italy
    [/\b(italy|italia|rome|roma|milan|milano|naples|napoli|florence|firenze)\b/, 'IT', 'Italy'],
    // Netherlands
    [/\b(netherlands|holland|amsterdam|rotterdam|utrecht|eindhoven)\b/, 'NL', 'Netherlands'],
    // Nordics
    [/\b(denmark|danmark|copenhagen|københavn|aarhus)\b/, 'DK', 'Denmark'],
    [/\b(sweden|sverige|stockholm|gothenburg|göteborg|malmö|malmo)\b/, 'SE', 'Sweden'],
    [/\b(norway|norge|oslo|bergen|trondheim)\b/, 'NO', 'Norway'],
    [/\b(finland|suomi|helsinki|tampere)\b/, 'FI', 'Finland'],
    [/\b(iceland|reykjavik)\b/, 'IS', 'Iceland'],
    // Other Europe
    [/\b(portugal|lisbon|lisboa|porto)\b/, 'PT', 'Portugal'],
    [/\b(ireland|dublin|cork)\b/, 'IE', 'Ireland'],
    [/\b(switzerland|schweiz|suisse|zurich|zürich|geneva|geneve|bern|basel)\b/, 'CH', 'Switzerland'],
    [/\b(austria|wien|vienna|graz|salzburg)\b/, 'AT', 'Austria'],
    [/\b(belgium|belgique|belgië|brussels|bruxelles|antwerp)\b/, 'BE', 'Belgium'],
    [/\b(poland|polska|warsaw|warszawa|krakow|kraków)\b/, 'PL', 'Poland'],
    [/\b(czech|czechia|prague|praha|brno)\b/, 'CZ', 'Czech Republic'],
    [/\b(romania|bucharest|bucurești|cluj)\b/, 'RO', 'Romania'],
    [/\b(greece|ελλάδα|athens|athína|thessaloniki)\b/, 'GR', 'Greece'],
    [/\b(ukraine|україна|kyiv|kiev|lviv|odessa)\b/, 'UA', 'Ukraine'],
    [/\b(turkey|türkiye|istanbul|ankara|izmir)\b/, 'TR', 'Turkey'],
    // Canada
    [/\b(canada|toronto|vancouver|montreal|montréal|calgary|ottawa|edmonton)\b/, 'CA', 'Canada'],
    // Mexico / Central / South America
    [/\b(mexico|méxico|mexico city|cdmx|guadalajara|monterrey)\b/, 'MX', 'Mexico'],
    [/\b(brazil|brasil|são paulo|sao paulo|rio de janeiro|brasília|brasilia)\b/, 'BR', 'Brazil'],
    [/\b(argentina|buenos aires|córdoba|cordoba)\b/, 'AR', 'Argentina'],
    [/\b(chile|santiago|valparaíso|valparaiso)\b/, 'CL', 'Chile'],
    [/\b(colombia|bogotá|bogota|medellín|medellin)\b/, 'CO', 'Colombia'],
    [/\b(peru|perú|lima|cusco)\b/, 'PE', 'Peru'],
    [/\b(uruguay|montevideo)\b/, 'UY', 'Uruguay'],
    // Asia
    [/\b(china|中国|beijing|shanghai|shenzhen|guangzhou|hong kong|hongkong)\b/, 'CN', 'China'],
    [/\b(japan|日本|tokyo|osaka|kyoto|yokohama)\b/, 'JP', 'Japan'],
    [/\b(south korea|korea|seoul|busan|incheon)\b/, 'KR', 'South Korea'],
    [/\b(india|भारत|delhi|mumbai|bangalore|bengaluru|hyderabad|chennai|kolkata|pune|howrah)\b/, 'IN', 'India'],
    [/\b(pakistan|karachi|lahore|islamabad)\b/, 'PK', 'Pakistan'],
    [/\b(bangladesh|dhaka|chittagong)\b/, 'BD', 'Bangladesh'],
    [/\b(sri lanka|colombo)\b/, 'LK', 'Sri Lanka'],
    [/\b(indonesia|jakarta|bali|surabaya)\b/, 'ID', 'Indonesia'],
    [/\b(singapore)\b/, 'SG', 'Singapore'],
    [/\b(malaysia|kuala lumpur|penang)\b/, 'MY', 'Malaysia'],
    [/\b(thailand|bangkok|chiang mai)\b/, 'TH', 'Thailand'],
    [/\b(vietnam|hanoi|ho chi minh|saigon)\b/, 'VN', 'Vietnam'],
    [/\b(philippines|manila|cebu)\b/, 'PH', 'Philippines'],
    [/\b(taiwan|taipei|kaohsiung)\b/, 'TW', 'Taiwan'],
    [/\b(israel|tel aviv|jerusalem|haifa)\b/, 'IL', 'Israel'],
    [/\b(uae|united arab emirates|dubai|abu dhabi)\b/, 'AE', 'UAE'],
    [/\b(saudi arabia|riyadh|jeddah)\b/, 'SA', 'Saudi Arabia'],
    // Africa
    [/\b(nigeria|lagos|abuja|ibadan|port harcourt)\b/, 'NG', 'Nigeria'],
    [/\b(kenya|nairobi|mombasa)\b/, 'KE', 'Kenya'],
    [/\b(south africa|johannesburg|cape town|durban|pretoria)\b/, 'ZA', 'South Africa'],
    [/\b(egypt|cairo|alexandria)\b/, 'EG', 'Egypt'],
    [/\b(morocco|casablanca|rabat|marrakech)\b/, 'MA', 'Morocco'],
    [/\b(ghana|accra)\b/, 'GH', 'Ghana'],
    [/\b(ethiopia|addis ababa)\b/, 'ET', 'Ethiopia'],
    [/\b(tunisia|tunis)\b/, 'TN', 'Tunisia'],
    [/\b(algeria|algiers)\b/, 'DZ', 'Algeria'],
    [/\b(rwanda|kigali)\b/, 'RW', 'Rwanda'],
    [/\b(uganda|kampala)\b/, 'UG', 'Uganda'],
    // Oceania
    [/\b(australia|sydney|melbourne|brisbane|perth|adelaide)\b/, 'AU', 'Australia'],
    [/\b(new zealand|auckland|wellington|christchurch)\b/, 'NZ', 'New Zealand'],
  ]

  for (const [re, code, name] of patterns) {
    if (re.test(s)) return { code, name }
  }
  return null
}

// Approximate country centroids [longitude, latitude]
const CENTROIDS: Record<string, [number, number]> = {
  US: [-98.5, 39.8], GB: [-2.0, 54.0], ES: [-3.7, 40.4], DE: [10.5, 51.1], FR: [2.4, 46.6],
  IT: [12.5, 41.9], NL: [5.3, 52.1], DK: [10.5, 56.0], SE: [15.0, 62.0], NO: [9.0, 62.0],
  FI: [26.0, 64.0], IS: [-19.0, 65.0], PT: [-8.0, 39.5], IE: [-8.0, 53.0], CH: [8.2, 46.8],
  AT: [14.5, 47.5], BE: [4.5, 50.5], PL: [19.0, 52.0], CZ: [15.5, 49.8], RO: [25.0, 45.9],
  GR: [22.0, 39.0], UA: [32.0, 49.0], TR: [35.0, 39.0], CA: [-106.0, 56.0], MX: [-102.5, 23.6],
  BR: [-53.0, -10.8], AR: [-63.6, -38.4], CL: [-71.5, -35.7], CO: [-74.3, 4.6], PE: [-75.0, -9.2],
  UY: [-55.8, -32.8], CN: [104.2, 35.9], JP: [138.0, 36.2], KR: [127.8, 36.5], IN: [78.0, 22.0],
  PK: [69.3, 30.4], BD: [90.3, 23.7], LK: [80.8, 7.9], ID: [113.9, -0.8], SG: [103.8, 1.35],
  MY: [101.9, 4.2], TH: [100.5, 15.9], VN: [108.3, 14.1], PH: [121.8, 12.9], TW: [121.0, 23.7],
  IL: [34.9, 31.0], AE: [54.4, 23.4], SA: [45.1, 23.9], NG: [8.0, 9.1], KE: [37.9, 0.0],
  ZA: [22.9, -30.6], EG: [30.8, 26.8], MA: [-7.1, 31.8], GH: [-1.0, 7.9], ET: [40.5, 9.1],
  TN: [9.5, 34.0], DZ: [1.7, 28.0], RW: [29.9, -1.9], UG: [32.3, 1.4], AU: [133.8, -25.3],
  NZ: [174.9, -40.9],
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('profiles')
    .select('location')
    .eq('published', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts: Record<string, { code: string; name: string; count: number; lng: number; lat: number }> = {}
  let unspecified = 0
  let total = 0

  for (const row of data || []) {
    total++
    const norm = normaliseLocation(row.location)
    if (!norm || !CENTROIDS[norm.code]) {
      unspecified++
      continue
    }
    const key = norm.code
    if (!counts[key]) {
      const [lng, lat] = CENTROIDS[norm.code]
      counts[key] = { code: norm.code, name: norm.name, count: 0, lng, lat }
    }
    counts[key].count++
  }

  const countries = Object.values(counts).sort((a, b) => b.count - a.count)
  return NextResponse.json({
    countries,
    totalBuilders: total,
    unspecified,
    countryCount: countries.length,
  })
}
