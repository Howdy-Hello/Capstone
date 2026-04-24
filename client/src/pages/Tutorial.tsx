export default function Tutorial() {
  return (
    <main className="page">
      <h1>Game Tutorial</h1>

      <section>
        <h2>Goal of the Game</h2>
        <p>
          Your goal is to grow your net worth by buying and selling virtual stocks.
          You start with a set amount of cash and must make smart trading decisions.
        </p>
      </section>

      <section>
        <h2>How Stocks Work</h2>
        <p>
          Each stock has a price that can rise or fall. Prices change because of
          random market movement and news events.
        </p>
      </section>

      <section>
        <h2>How to Make Money</h2>
        <ul>
          <li>Buy stocks when the price is low.</li>
          <li>Sell stocks after the price increases.</li>
          <li>Watch the news before making decisions.</li>
          <li>Diversify by buying different types of stocks.</li>
        </ul>
      </section>

      <section>
        <h2>How to Lose Money</h2>
        <ul>
          <li>Buying risky stocks without reading the news.</li>
          <li>Selling too early or too late.</li>
          <li>Putting all your money into one company.</li>
          <li>Ignoring market trends.</li>
        </ul>
      </section>
    </main>
  );
}