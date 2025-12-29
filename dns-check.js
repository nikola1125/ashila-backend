const dns = require('dns').promises;

async function checkDNSRecords() {
  const domain = 'farmaciashila.com';
  
  console.log(`Checking DNS records for ${domain}...\n`);
  
  try {
    // Check SPF record
    try {
      const spfRecords = await dns.resolveTxt(domain);
      const spfRecord = spfRecords.flat().find(record => record.startsWith('v=spf1'));
      console.log('✅ SPF Record:', spfRecord || 'NOT FOUND');
    } catch (err) {
      console.log('❌ SPF Record: NOT FOUND');
    }
    
    // Check DMARC record
    try {
      const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`);
      const dmarcRecord = dmarcRecords.flat().find(record => record.startsWith('v=DMARC1'));
      console.log('✅ DMARC Record:', dmarcRecord || 'NOT FOUND');
    } catch (err) {
      console.log('❌ DMARC Record: NOT FOUND');
    }
    
    // Check MX records
    try {
      const mxRecords = await dns.resolveMx(domain);
      console.log('✅ MX Records:', mxRecords);
    } catch (err) {
      console.log('❌ MX Records: NOT FOUND');
    }
    
    // Check A record
    try {
      const aRecords = await dns.resolve4(domain);
      console.log('✅ A Records:', aRecords);
    } catch (err) {
      console.log('❌ A Records: NOT FOUND');
    }
    
  } catch (error) {
    console.error('DNS check failed:', error.message);
  }
}

checkDNSRecords();
