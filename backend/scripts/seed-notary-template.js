import fs from 'fs';
import path from 'path';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';

async function createNotaryTemplate() {
  const plantillasDir = path.join(process.cwd(), 'uploads/plantillas');
  if (!fs.existsSync(plantillasDir)) {
    fs.mkdirSync(plantillasDir, { recursive: true });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "NOTARÍA PÚBLICA NÚMERO CUATRO", bold: true, size: 28, font: "Arial" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "LIC. JUAN CARLOS MARTÍNEZ RUIZ — TITULAR", bold: true, size: 20, font: "Arial" }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFY,
            children: [
              new TextRun({ text: "INSTRUMENTO NÚMERO ", bold: true, font: "Arial" }),
              new TextRun({ text: "{{instrumento_numero}}", bold: true, font: "Arial" }),
              new TextRun({ text: ". LIBRO ", bold: true, font: "Arial" }),
              new TextRun({ text: "{{instrumento_libro}}", bold: true, font: "Arial" }),
              new TextRun({ text: ". EN LA CIUDAD DE GUADALAJARA, JALISCO, A ", font: "Arial" }),
              new TextRun({ text: "{{fecha_escritura}}", bold: true, font: "Arial" }),
              new TextRun({ text: ", ANTE MÍ, LICENCIADO JUAN CARLOS MARTÍNEZ RUIZ, NOTARIO PÚBLICO TITULAR DE LA NOTARÍA NÚMERO CUATRO DE ESTA DEMARCACIÓN, COMPARECEN:", font: "Arial" }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFY,
            children: [
              new TextRun({ text: "POR UNA PARTE, COMO LA PARTE VENDEDORA, LA SEÑORA ", font: "Arial" }),
              new TextRun({ text: "{{vendedor_nombre}}", bold: true, font: "Arial" }),
              new TextRun({ text: ", POR SU PROPIO DERECHO. Y POR OTRA PARTE, COMO LA PARTE COMPRADORA, EL SEÑOR ", font: "Arial" }),
              new TextRun({ text: "{{comprador_nombre}}", bold: true, font: "Arial" }),
              new TextRun({ text: ", A QUIENES JUZGO CON CAPACIDAD LEGAL SUFICIENTE PARA CONTRATAR Y OBLIGARSE, Y FORMALIZAN UN CONTRATO DE COMPRAVENTA INMOBILIARIA BAJO LOS SIGUIENTES:", font: "Arial" }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "ANTECEDENTES", bold: true, size: 24, font: "Arial" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFY,
            children: [
              new TextRun({ text: "PRIMERO.- PROPIEDAD DEL INMUEBLE. ", bold: true, font: "Arial" }),
              new TextRun({ text: "DECLARA LA PARTE VENDEDORA QUE ES PROPIETARIA Y POSEEDORA EN PLENO DOMINIO DEL INMUEBLE UBICADO EN ", font: "Arial" }),
              new TextRun({ text: "{{inmueble_direccion}}", bold: true, font: "Arial" }),
              new TextRun({ text: ", CON UNA SUPERFICIE PRIVATIVA DE ", font: "Arial" }),
              new TextRun({ text: "{{inmueble_superficie}}", bold: true, font: "Arial" }),
              new TextRun({ text: ", CON CUENTA PREDIAL NÚMERO ", font: "Arial" }),
              new TextRun({ text: "{{inmueble_predial}}", bold: true, font: "Arial" }),
              new TextRun({ text: " Y FOLIO REAL NÚMERO ", font: "Arial" }),
              new TextRun({ text: "{{inmueble_folio_real}}", bold: true, font: "Arial" }),
              new TextRun({ text: ".", font: "Arial" }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "CLÁUSULAS", bold: true, size: 24, font: "Arial" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFY,
            children: [
              new TextRun({ text: "PRIMERA.- COMPRAVENTA. ", bold: true, font: "Arial" }),
              new TextRun({ text: "LA PARTE VENDEDORA VENDE, CEDE Y TRASPASA LIBRE DE TODO GRAVAMEN A FAVOR DE LA PARTE COMPRADORA, QUIEN ADQUIERE PARA SÍ, EL INMUEBLE DESCRITO EN EL ANTECEDENTE PRIMERO DE ESTE INSTRUMENTO.", font: "Arial" }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFY,
            children: [
              new TextRun({ text: "SEGUNDA.- PRECIO Y FORMA DE PAGO. ", bold: true, font: "Arial" }),
              new TextRun({ text: "EL PRECIO CONVENIDO POR LA PRESENTE OPERACIÓN ES LA CANTIDAD DE ", font: "Arial" }),
              new TextRun({ text: "{{operacion_precio}}", bold: true, font: "Arial" }),
              new TextRun({ text: " (", font: "Arial" }),
              new TextRun({ text: "{{operacion_precio_letra}}", bold: true, font: "Arial" }),
              new TextRun({ text: "), LA CUAL LA PARTE COMPRADORA PAGA A LA PARTE VENDEDORA EN SU TOTALIDAD A LA FIRMA DEL PRESENTE INSTRUMENTO.", font: "Arial" }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "CERTIFICACIONES NOTARIALES Y FIRMAS", bold: true, size: 22, font: "Arial" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFY,
            children: [
              new TextRun({ text: "YO, EL NOTARIO, CERTIFICO: QUE LO EXPUESTO FUE LEÍDO A LOS COMPARECIENTES, QUIENES MANIFIESTAN SU CONFORMIDAD Y FIRMAN PARA CONSTANCIA CON EL SUSCRITO NOTARIO QUE DA FE.", font: "Arial" }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const targetPath = path.join(plantillasDir, 'plantilla_compraventa_notaria4.docx');
  fs.writeFileSync(targetPath, buffer);
  console.log('✓ Plantilla Notarial parametrizada generada con éxito:', targetPath);
}

createNotaryTemplate().catch(console.error);
