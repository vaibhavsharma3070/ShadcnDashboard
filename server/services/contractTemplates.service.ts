/**
 * Contract Template service - handles all contract template-related database operations
 */

import { db } from '../db.js';
import { contractTemplate, type ContractTemplate, type InsertContractTemplate } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { NotFoundError } from './utils/errors.js';

export async function getContractTemplates(): Promise<ContractTemplate[]> {
  return await db.select().from(contractTemplate).orderBy(desc(contractTemplate.createdAt));
}

export async function getContractTemplate(id: string): Promise<ContractTemplate | undefined> {
  const [result] = await db
    .select()
    .from(contractTemplate)
    .where(eq(contractTemplate.templateId, id));
  return result || undefined;
}

export async function createContractTemplate(
  insertTemplate: InsertContractTemplate
): Promise<ContractTemplate> {
  const [newTemplate] = await db
    .insert(contractTemplate)
    .values({
      name: insertTemplate.name,
      content: insertTemplate.content,
      metadata: insertTemplate.metadata,
      isDefault: insertTemplate.isDefault ?? false,
      isActive: insertTemplate.isActive ?? true,
    })
    .returning();

  // If this is set as default, unset other defaults
  if (newTemplate.isDefault) {
    await db
      .update(contractTemplate)
      .set({ isDefault: false })
      .where(eq(contractTemplate.templateId, newTemplate.templateId).not());
  }

  return newTemplate;
}

export async function updateContractTemplate(
  id: string,
  updateTemplate: Partial<InsertContractTemplate>
): Promise<ContractTemplate> {
  const [existingTemplate] = await db
    .select()
    .from(contractTemplate)
    .where(eq(contractTemplate.templateId, id));

  if (!existingTemplate) {
    throw new NotFoundError('Contract Template', id);
  }

  const [updatedTemplate] = await db
    .update(contractTemplate)
    .set({
      ...(updateTemplate.name !== undefined && { name: updateTemplate.name }),
      ...(updateTemplate.content !== undefined && { content: updateTemplate.content }),
      ...(updateTemplate.metadata !== undefined && { metadata: updateTemplate.metadata }),
      ...(updateTemplate.isDefault !== undefined && { isDefault: updateTemplate.isDefault }),
      ...(updateTemplate.isActive !== undefined && { isActive: updateTemplate.isActive }),
    })
    .where(eq(contractTemplate.templateId, id))
    .returning();

  // If this is set as default, unset other defaults
  if (updateTemplate.isDefault === true) {
    await db
      .update(contractTemplate)
      .set({ isDefault: false })
      .where(eq(contractTemplate.templateId, id).not());
  }

  return updatedTemplate;
}

export async function deleteContractTemplate(id: string): Promise<void> {
  const [existingTemplate] = await db
    .select()
    .from(contractTemplate)
    .where(eq(contractTemplate.templateId, id));

  if (!existingTemplate) {
    throw new NotFoundError('Contract Template', id);
  }

  if (existingTemplate.isDefault) {
    throw new Error("Cannot delete the default template");
  }

  await db.delete(contractTemplate).where(eq(contractTemplate.templateId, id));
}

export async function getDefaultContractTemplate(): Promise<ContractTemplate | undefined> {
  const [result] = await db
    .select()
    .from(contractTemplate)
    .where(eq(contractTemplate.isDefault, true));
  return result || undefined;
}

export async function getDefaultTemplate(): Promise<ContractTemplate | undefined> {
  // Alias for getDefaultContractTemplate
  return getDefaultContractTemplate();
}

export async function ensureDefaultContractTemplate(): Promise<ContractTemplate> {
  // Check if default template exists
  const existing = await getDefaultContractTemplate();
  if (existing) {
    return existing;
  }

  // Create default template if it doesn't exist
  const defaultTemplate: InsertContractTemplate = {
    name: "Contrato Estándar de Consignación",
    content: `CONTRATO DE CONSIGNACIÓN

Entre {vendor_name}, con RUT {vendor_tax_id}, domiciliado en {vendor_address}, en adelante el "CONSIGNANTE", 
y CONSIGNACIONES CHILE LTDA, RUT 77.123.456-7, domiciliado en Av. Principal 123, Santiago, en adelante el "CONSIGNATARIO".

PRIMERO: OBJETO
El CONSIGNANTE entrega en consignación al CONSIGNATARIO los siguientes artículos:

{items_table}

SEGUNDO: PRECIO Y CONDICIONES
- Precio mínimo de venta: {min_price}
- Precio máximo de venta: {max_price}
- Comisión del consignatario: {commission_percentage}%
- Plazo de consignación: {consignment_days} días

TERCERO: OBLIGACIONES DEL CONSIGNATARIO
- Exhibir y promover la venta de los artículos
- Mantener los artículos en óptimas condiciones
- Informar al CONSIGNANTE sobre el estado de las ventas
- Liquidar las ventas según lo acordado

CUARTO: OBLIGACIONES DEL CONSIGNANTE
- Garantizar la propiedad de los artículos
- Mantener los artículos asegurados
- Proporcionar información veraz sobre los artículos

QUINTO: LIQUIDACIÓN
El CONSIGNATARIO liquidará al CONSIGNANTE dentro de {payment_days} días hábiles posteriores a la venta.

SEXTO: TÉRMINO
Este contrato tendrá una duración de {contract_duration} días, renovable automáticamente.

Fecha: {contract_date}

_______________________                _______________________
CONSIGNANTE                            CONSIGNATARIO
{vendor_name}                          CONSIGNACIONES CHILE LTDA
RUT: {vendor_tax_id}                   RUT: 77.123.456-7`,
    metadata: {
      variables: [
        "vendor_name",
        "vendor_tax_id", 
        "vendor_address",
        "items_table",
        "min_price",
        "max_price",
        "commission_percentage",
        "consignment_days",
        "payment_days",
        "contract_duration",
        "contract_date",
      ],
      sections: [
        "objeto",
        "precio_condiciones",
        "obligaciones_consignatario",
        "obligaciones_consignante",
        "liquidacion",
        "termino",
      ],
    },
    isDefault: true,
    isActive: true,
  };

  return await createContractTemplate(defaultTemplate);
}

export async function setDefaultTemplate(id: string): Promise<ContractTemplate> {
  const [existingTemplate] = await db
    .select()
    .from(contractTemplate)
    .where(eq(contractTemplate.templateId, id));

  if (!existingTemplate) {
    throw new NotFoundError('Contract Template', id);
  }

  // Unset all other defaults
  await db
    .update(contractTemplate)
    .set({ isDefault: false })
    .where(eq(contractTemplate.templateId, id).not());

  // Set this template as default
  const [updatedTemplate] = await db
    .update(contractTemplate)
    .set({ isDefault: true })
    .where(eq(contractTemplate.templateId, id))
    .returning();

  return updatedTemplate;
}