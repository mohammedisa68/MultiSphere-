fetch('https://api.alquran.cloud/v1/surah/1/editions/quran-simple,om.aburida').then(r=>r.json()).then(d=>console.log(JSON.stringify(d).substring(0,200)))
