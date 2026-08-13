import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './assets/main.css'

import App from './App.vue'
import router from './router'

import { setupGlobalErrorHandler } from './utils/errorHandler'

const app = createApp(App)

// 2. Initialize the error handler before using other plugins
setupGlobalErrorHandler(app)

app.use(createPinia())
app.use(router)

app.mount('#app')