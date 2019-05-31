import React from 'react';
import logo from './logo.svg';
import './App.css';

function App() {

  handleClick = () => {
    
  }

  return (
    <div className="App">
      <button onClick = {this.handleClick.bind(this)}></button>
      <button></button>
    </div>
  );
}

export default App;
