# ¿Me escuchas?

Experiencia web con HTML, CSS, JavaScript y recursos incluidos.

## Abrir en Visual Studio Code

1. Abre `me escuchas.code-workspace` con Visual Studio Code. También puedes usar Archivo → Abrir área de trabajo desde archivo.
2. Edita `index.html`, los archivos `.css` y `recorrido.js`. Las voces, los titulares y los elementos de las calles están en `assets/`.
3. En Terminal → Ejecutar tarea, selecciona **Ver experiencia en local**. Requiere Python 3. Abre http://127.0.0.1:8000.

Como alternativa, instala la extensión recomendada Live Server y abre `index.html` con **Open with Live Server**. Para el giro físico en celular, usa la página publicada por HTTPS; el paneo con el dedo funciona también sin sensores.

## Interacción

El recorrido avanza solo. Arrastra para mirar o gira el celular si autorizaste los sensores. Mantén un dedo quieto para acelerar; dos toques en la calle pausan o continúan.

Las noticias requieren tocar una esfera roja. Acercarse a un farol solo ilumina y anima la esfera. La última noticia queda al frente; las anteriores bajan de volumen y siguen hasta terminar. Repetir vuelve a iniciar la última voz; X oculta los titulares y los controles. El menú permite volumen y reinicio.

Los titulares no se duplican simultáneamente y las fechas usan números, como **02 de octubre**. La apertura de la reja corta voces, corazón y fondo; permanece el pitido sostenido. El cierre muestra el mensaje final.

Los 98 audios están incluidos y no requieren servicios de generación de voz. Son noticias ficticias con voces sintéticas. La introducción de la Alerta Ámber se retiró mediante edición local de la grabación.

## Revisión

- `ESCUCHAR-AUDIOS.html`: escuchar cada noticia.
- `ESCUCHAR-MEZCLA.html`: prueba breve de la mezcla sonora.
- `GUIONES.md`: textos de las noticias.
- `MEZCLA-SONORA.md`: comportamiento del sonido.

Sitio: https://gabrielamartinez1602.github.io/me-escuchas/
Repositorio: https://github.com/gabrielamartinez1602/me-escuchas
