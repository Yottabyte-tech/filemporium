import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [url, setCount] = useState(0)

  return (
    <>
    <div>
      <input type="url"></input>
      </div>
    </>
  )
}

export default App
