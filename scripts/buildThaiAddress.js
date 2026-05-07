const d = require('thai-data');
const fs = require('fs');
const path = require('path');

const all = d.getAllData();

// provinceId -> provinceName
const provinceMap = {};
// districtId -> { name, provinceId }
const districtMap = {};
// districtId -> [{ name, postalCode }]
const subDistrictMap = {};

all.forEach(item => {
  if (!item) return;

  // provinces
  (item.provinceList || []).forEach(prov => {
    if (prov && prov.provinceId && prov.provinceName) {
      provinceMap[prov.provinceId] = prov.provinceName;
    }
  });

  // districts
  (item.districtList || []).forEach(dist => {
    if (dist && dist.districtId && dist.districtName) {
      districtMap[dist.districtId] = {
        name: dist.districtName,
        provinceId: dist.proviceId || dist.provinceId,
      };
    }
  });

  // sub-districts
  const zip = item.zipCode || '';
  (item.subDistrictList || []).forEach(sub => {
    if (!sub || !sub.districtId || !sub.subDistrictName) return;
    if (!subDistrictMap[sub.districtId]) subDistrictMap[sub.districtId] = [];
    // avoid duplicates
    const exists = subDistrictMap[sub.districtId].some(s => s.name === sub.subDistrictName);
    if (!exists) {
      subDistrictMap[sub.districtId].push({ name: sub.subDistrictName, postalCode: zip });
    }
  });
});

// Build final structure
// { provinceName: { districtName: [{ name, postalCode }] } }
const result = {};

Object.entries(provinceMap).forEach(([provinceId, provinceName]) => {
  result[provinceName] = {};
});

Object.entries(districtMap).forEach(([districtId, dist]) => {
  const provinceName = provinceMap[dist.provinceId];
  if (!provinceName) return;
  result[provinceName][dist.name] = subDistrictMap[districtId] || [];
});

const outPath = path.join(__dirname, '../public/thaiAddress.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 0));
console.log('Done! Provinces:', Object.keys(result).length);
const totalDistricts = Object.values(result).reduce((a, v) => a + Object.keys(v).length, 0);
console.log('Total districts:', totalDistricts);
