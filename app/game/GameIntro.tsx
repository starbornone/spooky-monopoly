import "./GameIntro.css";

export const GameIntro = () => {
  return (
    <div className="game-intro">
      <h1 className="game-intro__title">
        Welcome to
        <br />
        Haunted Halloween
        <br />
        <span className="game-intro__monopoly">Monopoly 🎃💰</span>
      </h1>
      <p className="game-intro__description">
        Did you know Monopoly started as a radical critique? Born in the early
        20th century as &ldquo;The Landlord&apos;s Game,&rdquo; it was designed
        by Elizabeth Magie to expose the brutal inequalities of capitalism—how
        wealth concentrates, rents crush, and property becomes power. Fast
        forward, and it&apos;s now a family board game celebrating the very
        greed it once mocked. Talk about a haunting reversal!
      </p>
      <p className="game-intro__description">
        Halloween, too, has been gobbled up by the capitalist machine. What was
        once a blend of ancient harvest rites and spiritual reflection has
        morphed into a candy-coated, plastic-pumpkin bonanza—shipped globally
        with little regard for local traditions. In places like Australia, where
        spring blooms while the Northern Hemisphere carves
        jack-o&apos;-lanterns, this American cultural export is a hollow,
        out-of-season product push. It&apos;s cultural imperialism dressed in a
        cheap vampire cape, turning sacred and seasonal into a year-round
        revenue stream.
      </p>
      <p className="game-intro__description">
        Enter Haunted Halloween Monopoly, my Weird Web October experiment.
        I&apos;ve twisted the classic game into a spooky satire. Every roll of
        the die, every property snatched, mirrors both Monopoly&apos;s buried
        critique of greed and Halloween&apos;s commodified creep across borders.
        Play to &ldquo;win&rdquo;—but at what cost to culture, community, and
        meaning?
      </p>
    </div>
  );
};
