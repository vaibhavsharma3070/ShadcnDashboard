import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import type { Contract, Vendor } from '@shared/schema';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #000000',
    paddingBottom: 20,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 20,
  },
  contractNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  date: {
    fontSize: 10,
    textAlign: 'center',
    color: '#333333',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottom: '1 solid #CCCCCC',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    width: 150,
    color: '#333333',
  },
  value: {
    fontSize: 10,
    flex: 1,
    color: '#000000',
  },
  itemsTable: {
    marginTop: 10,
    borderTop: '1 solid #CCCCCC',
    paddingTop: 10,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 5,
    borderBottom: '1 solid #EEEEEE',
  },
  itemNumber: {
    fontSize: 10,
    width: 30,
    fontWeight: 'bold',
  },
  itemDescription: {
    fontSize: 10,
    flex: 1,
  },
  itemPrice: {
    fontSize: 10,
    width: 80,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  termsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 9,
    lineHeight: 1.5,
    textAlign: 'justify',
    color: '#333333',
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
  },
  signatureLine: {
    borderTop: '1 solid #000000',
    marginTop: 60,
    paddingTop: 5,
  },
  signatureLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  signatureSubLabel: {
    fontSize: 8,
    textAlign: 'center',
    color: '#666666',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#999999',
  },
  pageNumber: {
    fontSize: 8,
    textAlign: 'center',
    marginTop: 20,
  },
});

interface ContractPDFProps {
  contract: Contract & { vendor: Vendor };
}

export const ContractPDF = ({ contract }: ContractPDFProps) => {
  const contractDate = new Date(contract.createdAt).toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  // Parse item snapshots if they exist
  const items = contract.itemSnapshots || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>LUXETTE</Text>
          <Text style={styles.subtitle}>BOUTIQUE DE CONSIGNACIÓN DE LUJO</Text>
          <Text style={styles.contractNumber}>
            CONTRATO DE CONSIGNACIÓN Nº {contract.contractId.slice(0, 8).toUpperCase()}
          </Text>
          <Text style={styles.date}>Fecha: {contractDate}</Text>
        </View>

        {/* Vendor Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Consignador</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{contract.vendor.name || 'N/A'}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Correo Electrónico:</Text>
            <Text style={styles.value}>{contract.vendor.email || 'N/A'}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>Teléfono:</Text>
            <Text style={styles.value}>{contract.vendor.phone || 'N/A'}</Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>RUT/DNI:</Text>
            <Text style={styles.value}>{contract.vendor.taxId || 'N/A'}</Text>
          </View>

          {contract.vendor.bankName && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Banco:</Text>
                <Text style={styles.value}>{contract.vendor.bankName}</Text>
              </View>
              
              <View style={styles.row}>
                <Text style={styles.label}>Número de Cuenta:</Text>
                <Text style={styles.value}>{contract.vendor.bankAccountNumber || 'N/A'}</Text>
              </View>
              
              <View style={styles.row}>
                <Text style={styles.label}>Tipo de Cuenta:</Text>
                <Text style={styles.value}>{contract.vendor.accountType || 'N/A'}</Text>
              </View>
            </>
          )}
        </View>

        {/* Items List */}
        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Artículos en Consignación</Text>
            <View style={styles.itemsTable}>
              {items.map((item: any, index: number) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemNumber}>{index + 1}.</Text>
                  <Text style={styles.itemDescription}>
                    {item.name || 'Sin nombre'} - {item.brand || 'N/A'} - {item.description || 'N/A'}
                  </Text>
                  <Text style={styles.itemPrice}>
                    ${Number(item.currentPrice || 0).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Terms and Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.sectionTitle}>Términos y Condiciones</Text>
          <Text style={styles.termsText}>
            {contract.termsText || 'Los términos y condiciones se adjuntarán al contrato final.'}
          </Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>{contract.vendor.name || 'Consignador'}</Text>
              <Text style={styles.signatureSubLabel}>Consignador</Text>
            </View>
          </View>
          
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>LUXETTE</Text>
              <Text style={styles.signatureSubLabel}>Representante Autorizado</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          LUXETTE - Boutique de Consignación de Lujo | Este documento es un contrato legal vinculante
        </Text>
      </Page>
    </Document>
  );
};

export default ContractPDF;