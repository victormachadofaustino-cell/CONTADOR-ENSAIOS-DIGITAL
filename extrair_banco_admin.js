import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = {
  "project_id": "contador-digital-ccb",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCiADfJUdlZGBwb\nKGn3eSHT22hgxGoCITNIP7YYCHIO+ELA2fV6M5NmBOXo0yfNjEGmnLve+dwQB8Nt\niSqD3asdhqSHHHstMKMncTsgMVGCsw9JPsqXUExuLJGN05iX7D/Hl1mCSAuUmzcD\ngTYNIQFva18yaXgMDmfmbsX6kxJu1S7mza8s4A35cg+alUZ8AvqiqPrEakgZ1/C+\n9zQEvGvs0Foe3iq1tYEUM4gz7yUtnkeM/AirirX1oAtvz3Zl7fKILxDqZKjFQsj2\n0a9fY2uy/HnB6kz4nesCZbD8PAAN5jJ231su4FZ/UJgh5AXgLRYUFzQhJRkWWrcx\nca4Afgp1AgMBAAECggEABgsACbsgjRmVzXrfyQ10XOoYUKkYUzqt0QofXsd3NGZq\nXGCaWZPxnE1JI5A3hzauKZWQedbUMKeO0K0x2s1lWVVGbzZ5byFwqe39Xfa5AFPG\n7t0wGB40sP9p8TfCv21eoQaySLvV7WsveCqqZimkW2Wj8sYgZkK7Tss0Xg59EjPu\nWZt1Bxw0wjXsr3NBkF5ViwkeQ25GZGBtZYNg6HuEwlkYgjUTR9bgzHjuhfAAlwAf\nNmzVt/CO6cQhAMXk2iXMcvmvfnYZ9fG/sG64pgaFxBS4YzPjBr616hjmfbVli6rX\n9Ut313GIMkVcjPNvmk+xQOx+t9mEiP9Tc6ToLUhYWQKBgQDbeNrG2qroPCNZN/os\n0ZVMH2ryoKlBwBbA6Hno3gEWBg6N+D6jXhz4/xloSTkSlY6TXo9RWt3enE8NW/wA\nqKrhSnKPLWskCZkp0kLUIzM50feo2bYgZ1z7ScxSG3nNAnsMx8SarFohUnOSoF2l\nsod13iYVMmXHpsQO86kArxM2iwKBgQC89qkepSeMP9qXYmcN1kfsOPaMTkhok9J0\nQnobn72mIRCqObmxIixTgydavzu1AsyFxN082pgoS/Foy4vxKYqznLx1KBvAfLkE\nxRUPp8kI5/L3CEnckRJfZ73SEtNPw/XVLSzIuNVpfCVmcR7bSHVucK4Rs7tMbOFg\n7oKI7Rzi/wKBgGW76NXiyPRr5ArYWtxprmYh7iZX+P1keGelm9UpC6HU3uxKVWbP\nGmkFfxaLUqxdrUB8xbx1fYFSPYa4y+DWTpeuNdpOuGp1FI2BTL8fLgCwZrfba4Qr\nxbsqI08wM06nxrhO5cC5AfKOUMp4EdDcJ9SoTEjpGqroj9tKcV3CygovAoGARUBY\nhoScU8frAmPrxKRtQ2M06AKggsL58+WQ/qKyTDn984SoSwRtHkYInDdNWG8oKTYW\npoCuFsaOOIuwQ7env1+HqaADW63Z2Kepqk0hXgQzhNkiyJTaGODaLiz8CFWWuIOP\n0Bf9DmWTB1IZrt+FOe5NvOsTj1Sv3GhMqoXLel0CgYAsIPUz3Z5zBLydCMrGGXvt\nALbGtgRMklbTGXNHRjR+rjoNS8zcs9z234u6p9NcMbnOcE/j/8KFC5YhcT+2rQZm\n0kGWJT3e4vwLVnx8+/te9qSBx+DF090S2mbN5g5jTXQhaS2pdQA+G9DhAeLVoFwr\ny1zDpnUXoPDCGzFSJ5R27Q==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@contador-digital-ccb.iam.gserviceaccount.com"
};

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function extrair() {
  let data = "=== BACKUP TOTAL SANEADO ===\n";
  const colecoes = ['comuns', 'config_instrumentos_nacional', 'referencia_cargos', 'users', 'config_cidades'];

  for (const col of colecoes) {
    const snap = await db.collection(col).get();
    data += `\nCOLEÇÃO: ${col}\n`;
    for (const doc of snap.docs) {
      data += `ID: ${doc.id} => ${JSON.stringify(doc.data())}\n`;
      if (col === 'comuns') {
        const subColecoes = ['events', 'instrumentos_config', 'ministerio_lista'];
        for (const sub of subColecoes) {
          const sSnap = await db.collection(col).doc(doc.id).collection(sub).get();
          sSnap.forEach(sDoc => data += `   [SUB ${sub}] ${sDoc.id} => ${JSON.stringify(sDoc.data())}\n`);
        }
      }
    }
  }
  fs.writeFileSync('banco_final_consolidado.txt', data);
  console.log("✅ Banco extraído com sucesso!");
}

extrair();