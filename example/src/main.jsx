import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'

if (process.env.NODE_ENV === 'development') {
  require('./mock/browser')
}

let count = 0
import.meta.compileTime("./code.ts")

console.log(count)

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
