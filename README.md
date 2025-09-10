# Proyecto de Electrónica - React + Tailwind CSS

Este proyecto es una aplicación web para el control y monitoreo de dispositivos electrónicos, desarrollada con React y Tailwind CSS 3.4.

## 🚀 Tecnologías Utilizadas

- **React 18** con TypeScript
- **Tailwind CSS 3.4** para estilos
- **PostCSS** y **Autoprefixer** para procesamiento de CSS

## 📋 Requisitos Previos

- Node.js (versión 16 o superior)
- npm (incluido con Node.js)

## 🛠️ Instalación

1. Clonar o descargar el proyecto
2. Navegar al directorio del proyecto:
   ```bash
   cd electronic-project
   ```

3. Instalar las dependencias:
   ```bash
   npm install
   ```

## 🏃‍♂️ Ejecución en Desarrollo

Para iniciar el servidor de desarrollo:

```bash
npm start
```

La aplicación se abrirá automáticamente en [http://localhost:3000](http://localhost:3000).

## 📦 Construcción para Producción

Para crear una versión optimizada para producción:

```bash
npm run build
```

Los archivos generados estarán en la carpeta `build/`.

## 🎨 Estructura del Proyecto

```
electronic-project/
├── src/
│   ├── components/          # Componentes React
│   ├── App.tsx             # Componente principal
│   ├── index.css           # Estilos globales con Tailwind
│   └── index.tsx           # Punto de entrada
├── public/
├── tailwind.config.js      # Configuración de Tailwind CSS
├── postcss.config.js       # Configuración de PostCSS
└── package.json            # Dependencias del proyecto
```

## 🔧 Configuración de Tailwind CSS

El proyecto está configurado con Tailwind CSS 3.4 con las siguientes características:

- Soporte completo para React y TypeScript
- Configuración optimizada para producción
- Clases utilitarias modernas
- Soporte para modo oscuro (listo para implementar)

## 🎯 Características Implementadas

- **Dashboard electrónico** con tarjetas de estado
- **Control de sensores** (temperatura, LED, motor)
- **Interfaz moderna** con diseño responsivo
- **Animaciones suaves** con Tailwind
- **Sistema de estados** visual para conexiones

## 📝 Scripts Disponibles

- `npm start` - Inicia el servidor de desarrollo
- `npm run build` - Construye para producción
- `npm test` - Ejecuta las pruebas
- `npm run eject` - Expone la configuración de Create React App

## 🚀 Próximos Pasos

Para continuar desarrollando este proyecto:

1. Agregar componentes adicionales en `src/components/`
2. Implementar lógica de estado con Context API o Redux
3. Agregar integración con APIs de hardware
4. Implementar gráficos en tiempo real
5. Agregar modo oscuro

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT.
