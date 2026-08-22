import { APP_NAME, APP_TAGLINE } from './meta'

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('#app root element missing')
}

app.innerHTML = `<h1>${APP_NAME}</h1><p>${APP_TAGLINE}</p>`
