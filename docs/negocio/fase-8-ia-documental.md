# Fase 8 — IA documental con costo y trazabilidad controlados

## Alcance

La asistencia documental usa `gpt-5.4-nano` como modelo principal y `gpt-5.4-mini` únicamente para escalamiento. Una configuración heredada con otro modelo no puede sustituir silenciosamente estos valores operativos.

La selección está alineada con la [documentación oficial de GPT-5.4 nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano): admite Responses API, razonamiento, imágenes de entrada y salidas estructuradas; está orientado a clasificación y extracción de bajo costo.

No se ejecutaron solicitudes pagadas durante esta fase. Las pruebas usan reglas determinísticas y la validación visual solo consulta configuración y métricas vacías.

## Flujo obligatorio

El flujo implementado es:

1. documento privado;
2. extracción estructurada;
3. validación determinística;
4. propuesta con fuente y confianza;
5. revisión humana;
6. confirmación o corrección;
7. persistencia definitiva.

La respuesta del modelo nunca se guarda automáticamente como dato jurídico definitivo.

## Fuentes y conflictos

Cada campo propuesto conserva valor, documento, ID temporal o definitivo, modelo, confianza y estado. Al confirmar un compareciente, `compareciente_datos_fuente` distingue:

- confirmado sin cambios;
- editado manualmente;
- descartado;
- en conflicto.

La consolidación agrupa todas las lecturas del mismo campo. Si dos fuentes presentan valores diferentes, el sistema no selecciona siquiera la de mayor jerarquía: muestra todas las alternativas, excluye el campo del prellenado y exige decisión humana.

La jerarquía configurada prioriza, entre otros:

| Campo | Orden de fuentes |
| --- | --- |
| RFC | Constancia fiscal → documento oficial → ficha o declaración |
| Identidad | INE/pasaporte → CURP → ficha |
| Domicilio fiscal | Constancia de situación fiscal |
| Domicilio particular | Comprobante de domicilio → INE |

## Escalamiento eficiente

La primera solicitud usa `gpt-5.4-nano` con salida JSON estricta. Solo se escala cuando hay una lectura dudosa/deficiente o valores contradictorios. La segunda solicitud:

- usa `gpt-5.4-mini`;
- envía únicamente los documentos implicados;
- limita el subconjunto a cuatro documentos;
- registra el motivo;
- nunca se dispara si el primer resultado es claro;
- puede deshabilitarse con `AI_ESCALATION_ENABLED=false`.

La revisión jurídica de un proyecto de escritura se considera una operación compleja y usa directamente el modelo de escalamiento. Toda interfaz y reporte mantiene la leyenda: **IA ≠ aprobación jurídica**.

## Métricas

La tabla aditiva `pravia_os.ai_usage_logs` registra por solicitud:

- modelo y operación;
- usuario, expediente y sesión de alta cuando aplican;
- tokens de entrada, caché, salida, razonamiento y totales;
- duración y documentos enviados;
- costo estimado;
- escalamiento y motivo;
- estado o código de error.

No guarda claves, contenido de prompts ni cuerpos documentales. El centro `/inteligencia` permite filtrar y consultar consumo, modelos, operaciones y solicitudes recientes. La clave solo se expone como estado booleano de configuración.

Los precios de estimación vigentes en esta entrega son:

| Modelo | Entrada / 1M | Entrada en caché / 1M | Salida / 1M |
| --- | ---: | ---: | ---: |
| `gpt-5.4-nano` | USD 0.20 | USD 0.02 | USD 1.25 |
| `gpt-5.4-mini` | USD 0.75 | USD 0.075 | USD 4.50 |

La fecha de la tabla de precios queda guardada en cada medición para permitir auditoría histórica.

## Validación realizada

- migración remota aditiva aplicada y reflejada localmente;
- tabla verificada con 21 columnas, tres llaves foráneas y cero filas iniciales;
- esquema Prisma generado y válido;
- 38 pruebas aprobadas en seis archivos, incluidas consolidación, conflicto y escalamiento;
- backend y frontend compilados para producción;
- centro de inteligencia revisado visualmente con `gpt-5.4-nano` principal y `gpt-5.4-mini` de escalamiento;
- ninguna solicitud a OpenAI ni escritura operativa fue ejecutada en la validación;
- revisión posterior de seguridad sin hallazgos nuevos; permanecen los nueve hallazgos heredados asignados a la Fase 10.
