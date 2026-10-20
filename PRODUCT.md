# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Estudiantes de medicina** (pregrado e internado) que repasan anatomía antes de exámenes y prácticas. Necesitan aprendizaje visual, definiciones claras, cuestionarios, favoritos y seguimiento de avance.
- **Médicos y profesionales sanitarios** (residentes, médicos generales y especialistas) que consultan una estructura con rapidez o la explican a un paciente. Necesitan búsqueda precisa, terminología estándar y referencias.
- **Docentes e instituciones** que preparan clases y asignan material. Necesitan colecciones temáticas, material reutilizable y licencias por volumen.

Uso en escritorio (estudio y consulta) y en móvil/tablet (repaso breve, explicación al paciente en consulta).

## Product Purpose

Atlas Anatómico es un atlas de anatomía humana en 3D con enciclopedia clínica, recorridos guiados, cuestionarios y un reto de ubicación anatómica. Existe para que un estudiante explore el cuerpo de forma intuitiva y un profesional encuentre información precisa sin fricción. El éxito se mide en sesiones de estudio recurrentes, dominio por órgano y conversión a suscripción de pago.

## Positioning

Atlas en español de México, con nomenclatura clínica, precios en MXN y correlación clínica por órgano. La experiencia está pensada para el plan de estudios latinoamericano, no traducida de un producto anglosajón.

## Operating Context

- Rutas: `/` (landing), `/atlas` (explorador 3D + enciclopedia), `/juego` (reto anatómico), `/dashboard` (panel de estudio), `/cuenta` (perfil y facturación), autenticación (`/login`, `/registro`, `/recuperar`, `/restablecer`, `/verificar`), `/acerca`.
- Bilingüe es-MX / en-US con cambio en vivo.
- Despliegue en Vercel (libSQL/Turso) o Cloudflare Workers (D1).

## Capabilities and Constraints

- 9 especímenes 3D (corazón, cerebro, pulmones, hígado, riñones, ojo, intestino, páncreas, piel). Son mallas de una sola pieza **generadas por IA (Tripo)**, sin segmentación por estructura: los puntos señalados se colocan a mano y no se pueden ocultar, aislar ni medir estructuras individuales. Ver `docs/ANATOMY-MODELS.md`.
- Suscripciones recurrentes con **PayPal Subscriptions API** (único procesador). Planes: Gratis, Estudiante, Profesional, Institucional.
- Contenido educativo: no constituye diagnóstico ni consejo médico individualizado.
- Abierto: catálogo anatómico con fuentes licenciadas (Z-Anatomy, BodyParts3D), gestión institucional de grupos, precios definitivos.

## Brand Commitments

- Nombre: **Atlas Anatómico**. Desarrollado por DevHive Software.
- Tono sobrio, clínico y preciso. Nada de lenguaje futurista exagerado.
- Paleta base pedida por el propietario: navy institucional `#10243A`, azul médico `#176B99`, azul de interacción `#1677B8`, turquesa clínico `#20A6A2`, superficies `#F5F8FB`, texto `#152535`. La auditoría de contraste puede ajustar los tonos.

## Evidence on Hand

- Ilustraciones por órgano en `public/anatomy/<organo>/*.webp` y modelos en `public/models/*.glb`.
- No existen testimonios, instituciones asociadas, certificaciones ni estadísticas de uso. **No se deben inventar.**

## Product Principles

1. La precisión anatómica gana a la espectacularidad: no se muestra ni se promete una estructura que no esté implementada.
2. El modelo 3D es el protagonista: cada control le cede superficie útil.
3. Los permisos de pago se otorgan solo con evidencia verificada del procesador.
4. Un solo producto que se adapta al perfil (estudiante, profesional, docente), sin bifurcar la plataforma.

## Accessibility & Inclusion

Objetivo WCAG 2.2 AA. Toda función usable con teclado y sin depender solo del color. Respeta `prefers-reduced-motion`.
