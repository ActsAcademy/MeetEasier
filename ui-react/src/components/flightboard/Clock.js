import React, { Component } from 'react';

class Clock extends Component {
  constructor(props) {
    super(props);
    this.state = {
      date: new Date()
    }

    this.tick = this.tick.bind(this);
  }

  tick() {
    this.setState ({
      date: new Date()
    });
  }

  componentDidMount = () => {
    this.timerID = setInterval(this.tick, 1000);
  }

  componentWillUnmount = () => {
    clearInterval(this.timerID);
  }

  render() {
  const hours = String(this.state.date.getHours()).padStart(2, '0');
  const minutes = String(this.state.date.getMinutes()).padStart(2, '0');
  const seconds = String(this.state.date.getSeconds()).padStart(2, '0');

    return (
      <span id="clock">
       {`${hours}:${minutes}:${seconds}`}
      </span>
    );
  }
}

export default Clock;
