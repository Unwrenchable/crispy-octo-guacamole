const express = require('express');
const http = require('http');
const https = require('https');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// In-memory storage for games
const games = new Map();

// Helper function to generate unique game PIN
function generateGamePin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper function to fetch questions from Open Trivia DB
async function fetchOpenTriviaQuestions(amount = 10, category = null, difficulty = null) {
  return new Promise((resolve, reject) => {
    let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
    if (category) url += `&category=${category}`;
    if (difficulty) url += `&difficulty=${difficulty}`;

    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.response_code === 0) {
            const questions = result.results.map(q => {
              // Shuffle options BEFORE creating the question object
              const allOptions = [...q.incorrect_answers.map(a => decodeHTML(a)), decodeHTML(q.correct_answer)];
              const shuffledOptions = shuffleArray(allOptions);
              const correctAnswer = decodeHTML(q.correct_answer);
              
              return {
                text: decodeHTML(q.question),
                options: shuffledOptions,
                correctAnswer: correctAnswer, // This will match the text in shuffledOptions
                category: decodeHTML(q.category),
                difficulty: q.difficulty
              };
            });
            resolve(questions);
          } else {
            reject(new Error('Failed to fetch questions from Open Trivia DB'));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Helper function to decode HTML entities
function decodeHTML(html) {
  const entities = {
    '&quot;': '"',
    '&#039;': "'",
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&rsquo;': "'",
    '&lsquo;': "'"
  };
  return html.replace(/&[#\w]+;/g, entity => entities[entity] || entity);
}

// Helper function to shuffle array
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Pre-loaded question banks by genre — 50 questions per category, difficulty tagged
const QUESTION_BANKS = {
  sports: [
    // ── Easy ──────────────────────────────────────────────────────────────
    { text: "How many players are on a basketball team on the court?", options: ["4", "5", "6", "7"], correctAnswer: "5", category: "Sports", difficulty: "easy" },
    { text: "Which sport is known as 'The Beautiful Game'?", options: ["Basketball", "Baseball", "Soccer", "Tennis"], correctAnswer: "Soccer", category: "Sports", difficulty: "easy" },
    { text: "How many holes are played in a standard round of golf?", options: ["9", "12", "18", "24"], correctAnswer: "18", category: "Sports", difficulty: "easy" },
    { text: "In which sport would you perform a 'slam dunk'?", options: ["Volleyball", "Basketball", "Tennis", "Baseball"], correctAnswer: "Basketball", category: "Sports", difficulty: "easy" },
    { text: "How many Grand Slam tournaments are there in tennis?", options: ["3", "4", "5", "6"], correctAnswer: "4", category: "Sports", difficulty: "easy" },
    { text: "How many bases are on a baseball field?", options: ["3", "4", "5", "6"], correctAnswer: "4", category: "Sports", difficulty: "easy" },
    { text: "How many points is a touchdown worth in American football?", options: ["3", "5", "6", "7"], correctAnswer: "6", category: "Sports", difficulty: "easy" },
    { text: "Which Grand Slam tennis tournament is played on grass?", options: ["US Open", "French Open", "Wimbledon", "Australian Open"], correctAnswer: "Wimbledon", category: "Sports", difficulty: "easy" },
    { text: "What is the height of a regulation basketball hoop in feet?", options: ["8", "9", "10", "11"], correctAnswer: "10", category: "Sports", difficulty: "easy" },
    { text: "How many players are on a soccer team on the field?", options: ["9", "10", "11", "12"], correctAnswer: "11", category: "Sports", difficulty: "easy" },
    { text: "In which sport would you find a 'love' score?", options: ["Golf", "Tennis", "Cricket", "Badminton"], correctAnswer: "Tennis", category: "Sports", difficulty: "easy" },
    { text: "How long is an Olympic swimming pool in meters?", options: ["25", "50", "75", "100"], correctAnswer: "50", category: "Sports", difficulty: "easy" },
    { text: "What is the term for three strikes in a row in bowling?", options: ["Eagle", "Turkey", "Birdie", "Ace"], correctAnswer: "Turkey", category: "Sports", difficulty: "easy" },
    { text: "Which country hosted the 2016 Summer Olympics?", options: ["China", "Brazil", "UK", "Japan"], correctAnswer: "Brazil", category: "Sports", difficulty: "easy" },
    { text: "Which country won the 2018 FIFA World Cup?", options: ["Brazil", "Germany", "France", "Argentina"], correctAnswer: "France", category: "Sports", difficulty: "easy" },
    { text: "What is the national sport of Japan?", options: ["Karate", "Sumo Wrestling", "Judo", "Kendo"], correctAnswer: "Sumo Wrestling", category: "Sports", difficulty: "easy" },
    { text: "How many minutes is each period in an NHL hockey game?", options: ["15", "20", "25", "30"], correctAnswer: "20", category: "Sports", difficulty: "easy" },
    // ── Medium ────────────────────────────────────────────────────────────
    { text: "What is the maximum score in a single frame of bowling?", options: ["10", "20", "30", "300"], correctAnswer: "30", category: "Sports", difficulty: "medium" },
    { text: "What is the diameter of a basketball hoop in inches?", options: ["16", "18", "20", "22"], correctAnswer: "18", category: "Sports", difficulty: "medium" },
    { text: "How many players are on a volleyball team on the court?", options: ["5", "6", "7", "8"], correctAnswer: "6", category: "Sports", difficulty: "medium" },
    { text: "What sport uses terms like 'birdie', 'eagle', and 'bogey'?", options: ["Tennis", "Golf", "Bowling", "Cricket"], correctAnswer: "Golf", category: "Sports", difficulty: "medium" },
    { text: "In American football, how many points is a field goal worth?", options: ["1", "2", "3", "6"], correctAnswer: "3", category: "Sports", difficulty: "medium" },
    { text: "How many events are in a decathlon?", options: ["5", "7", "10", "12"], correctAnswer: "10", category: "Sports", difficulty: "medium" },
    { text: "What country has won the most FIFA World Cup titles?", options: ["Germany", "Argentina", "Brazil", "Italy"], correctAnswer: "Brazil", category: "Sports", difficulty: "medium" },
    { text: "In boxing, how many rounds are in a standard world championship fight?", options: ["8", "10", "12", "15"], correctAnswer: "12", category: "Sports", difficulty: "medium" },
    { text: "What is the distance of a marathon in miles?", options: ["23.1", "24.5", "26.2", "28.0"], correctAnswer: "26.2", category: "Sports", difficulty: "medium" },
    { text: "In which sport is the Stanley Cup awarded?", options: ["Basketball", "Ice Hockey", "Football", "Soccer"], correctAnswer: "Ice Hockey", category: "Sports", difficulty: "medium" },
    { text: "How many players are on a baseball team on the field?", options: ["7", "8", "9", "10"], correctAnswer: "9", category: "Sports", difficulty: "medium" },
    { text: "What country did the 2022 FIFA World Cup take place in?", options: ["UAE", "Qatar", "Saudi Arabia", "Bahrain"], correctAnswer: "Qatar", category: "Sports", difficulty: "medium" },
    { text: "In tennis, what is it called when both players have 40 points?", options: ["Tie", "Deuce", "Love", "Break"], correctAnswer: "Deuce", category: "Sports", difficulty: "medium" },
    { text: "What is the governing body of international soccer?", options: ["FIFA", "UEFA", "CONCACAF", "IOC"], correctAnswer: "FIFA", category: "Sports", difficulty: "medium" },
    // ── Hard ──────────────────────────────────────────────────────────────
    { text: "How many stitches are on a regulation Major League Baseball?", options: ["88", "108", "128", "144"], correctAnswer: "108", category: "Sports", difficulty: "hard" },
    { text: "What year did Muhammad Ali win his first Olympic gold medal?", options: ["1956", "1960", "1964", "1968"], correctAnswer: "1960", category: "Sports", difficulty: "hard" },
    { text: "Which country won the first Rugby World Cup in 1987?", options: ["Australia", "England", "New Zealand", "South Africa"], correctAnswer: "New Zealand", category: "Sports", difficulty: "hard" },
    { text: "How long is the infield in MLB in feet from home plate to second base?", options: ["90", "106", "127", "140"], correctAnswer: "127", category: "Sports", difficulty: "hard" },
    { text: "What NBA player scored 100 points in a single game?", options: ["Michael Jordan", "Kobe Bryant", "LeBron James", "Wilt Chamberlain"], correctAnswer: "Wilt Chamberlain", category: "Sports", difficulty: "hard" },
    { text: "What is the minimum weight of a golf ball in ounces?", options: ["1.42", "1.62", "1.82", "2.02"], correctAnswer: "1.62", category: "Sports", difficulty: "hard" },
    { text: "In what year did women's ski jumping debut at the Winter Olympics?", options: ["2006", "2010", "2014", "2018"], correctAnswer: "2014", category: "Sports", difficulty: "hard" },
    { text: "How many dimples does a standard golf ball have?", options: ["206", "336", "392", "500"], correctAnswer: "336", category: "Sports", difficulty: "hard" },
    { text: "What is the width of an NFL football field in yards including end zones?", options: ["53.3", "100", "120", "160"], correctAnswer: "53.3", category: "Sports", difficulty: "hard" },
    { text: "Who holds the record for most career rushing yards in NFL history?", options: ["Barry Sanders", "Walter Payton", "Emmitt Smith", "Adrian Peterson"], correctAnswer: "Emmitt Smith", category: "Sports", difficulty: "hard" },
    { text: "In cricket, how many balls are in a standard over?", options: ["4", "5", "6", "8"], correctAnswer: "6", category: "Sports", difficulty: "hard" },
    { text: "What country has won the most Olympic gold medals all-time?", options: ["Russia", "China", "Great Britain", "USA"], correctAnswer: "USA", category: "Sports", difficulty: "hard" },
  ],
  movies: [
    // ── Easy ──────────────────────────────────────────────────────────────
    { text: "Who played Iron Man in the Marvel Cinematic Universe?", options: ["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Mark Ruffalo"], correctAnswer: "Robert Downey Jr.", category: "Movies", difficulty: "easy" },
    { text: "What was the first Pixar movie?", options: ["Finding Nemo", "Toy Story", "A Bug's Life", "Monsters Inc."], correctAnswer: "Toy Story", category: "Movies", difficulty: "easy" },
    { text: "Who played the Joker in 'The Dark Knight'?", options: ["Jack Nicholson", "Jared Leto", "Heath Ledger", "Joaquin Phoenix"], correctAnswer: "Heath Ledger", category: "Movies", difficulty: "easy" },
    { text: "What is the fictional African country in 'Black Panther'?", options: ["Wakanda", "Zamunda", "Genovia", "Krakozhia"], correctAnswer: "Wakanda", category: "Movies", difficulty: "easy" },
    { text: "Which movie features the quote 'Here's looking at you, kid'?", options: ["Gone with the Wind", "Casablanca", "Citizen Kane", "The Maltese Falcon"], correctAnswer: "Casablanca", category: "Movies", difficulty: "easy" },
    { text: "Who directed 'Jurassic Park'?", options: ["James Cameron", "Steven Spielberg", "George Lucas", "Ridley Scott"], correctAnswer: "Steven Spielberg", category: "Movies", difficulty: "easy" },
    { text: "In which movie does Tom Hanks say 'Life is like a box of chocolates'?", options: ["Cast Away", "Forrest Gump", "Philadelphia", "Big"], correctAnswer: "Forrest Gump", category: "Movies", difficulty: "easy" },
    { text: "What was the first feature-length animated movie ever released?", options: ["Fantasia", "Snow White", "Pinocchio", "Bambi"], correctAnswer: "Snow White", category: "Movies", difficulty: "easy" },
    { text: "Which movie won Best Picture at the 2022 Oscars?", options: ["CODA", "Dune", "Belfast", "West Side Story"], correctAnswer: "CODA", category: "Movies", difficulty: "easy" },
    { text: "Which movie features a character named Hannibal Lecter?", options: ["Psycho", "The Silence of the Lambs", "Seven", "Zodiac"], correctAnswer: "The Silence of the Lambs", category: "Movies", difficulty: "easy" },
    { text: "What is the highest-grossing film of all time (unadjusted)?", options: ["Titanic", "Avatar", "Avengers: Endgame", "Star Wars"], correctAnswer: "Avatar", category: "Movies", difficulty: "easy" },
    { text: "What year was the first 'Star Wars' movie released?", options: ["1975", "1977", "1979", "1980"], correctAnswer: "1977", category: "Movies", difficulty: "easy" },
    // ── Medium ────────────────────────────────────────────────────────────
    { text: "Who directed 'Pulp Fiction'?", options: ["Martin Scorsese", "Quentin Tarantino", "Steven Spielberg", "Christopher Nolan"], correctAnswer: "Quentin Tarantino", category: "Movies", difficulty: "medium" },
    { text: "Who directed 'The Shawshank Redemption'?", options: ["Steven Spielberg", "Frank Darabont", "Martin Scorsese", "Quentin Tarantino"], correctAnswer: "Frank Darabont", category: "Movies", difficulty: "medium" },
    { text: "Which movie won the Oscar for Best Picture in 2020?", options: ["1917", "Joker", "Parasite", "Once Upon a Time in Hollywood"], correctAnswer: "Parasite", category: "Movies", difficulty: "medium" },
    { text: "What is the name of the hotel in 'The Shining'?", options: ["Bates Motel", "Hotel California", "The Overlook Hotel", "Grand Budapest Hotel"], correctAnswer: "The Overlook Hotel", category: "Movies", difficulty: "medium" },
    { text: "Who composed the score for 'Inception'?", options: ["John Williams", "Hans Zimmer", "Ennio Morricone", "Howard Shore"], correctAnswer: "Hans Zimmer", category: "Movies", difficulty: "medium" },
    { text: "Which film won the first ever Oscar for Best Animated Feature?", options: ["Shrek", "Monsters Inc.", "Toy Story", "Finding Nemo"], correctAnswer: "Shrek", category: "Movies", difficulty: "medium" },
    { text: "Which actor has been in the most Marvel movies?", options: ["Chris Evans", "Robert Downey Jr.", "Scarlett Johansson", "Samuel L. Jackson"], correctAnswer: "Samuel L. Jackson", category: "Movies", difficulty: "medium" },
    { text: "What movie is known for the line 'You can't handle the truth!'?", options: ["A Few Good Men", "The Verdict", "Philadelphia", "JFK"], correctAnswer: "A Few Good Men", category: "Movies", difficulty: "medium" },
    { text: "Which movie franchise features a character named Dom Toretto?", options: ["Mission Impossible", "Fast & Furious", "Transformers", "Die Hard"], correctAnswer: "Fast & Furious", category: "Movies", difficulty: "medium" },
    { text: "In 'The Matrix', does Neo take the red pill or blue pill to see the truth?", options: ["Blue pill", "Red pill", "Green pill", "White pill"], correctAnswer: "Red pill", category: "Movies", difficulty: "medium" },
    { text: "What planet does the movie 'Interstellar' feature prominently?", options: ["Mars", "Saturn", "Jupiter", "Neptune"], correctAnswer: "Saturn", category: "Movies", difficulty: "medium" },
    { text: "Who plays the lead character in the John Wick franchise?", options: ["Tom Cruise", "Keanu Reeves", "Jason Statham", "Dwayne Johnson"], correctAnswer: "Keanu Reeves", category: "Movies", difficulty: "medium" },
    { text: "Which Disney movie features the song 'Let It Go'?", options: ["Tangled", "Brave", "Frozen", "Moana"], correctAnswer: "Frozen", category: "Movies", difficulty: "medium" },
    { text: "What film is set mostly on the luxury ocean liner RMS Titanic?", options: ["The Poseidon Adventure", "Titanic", "Cast Away", "The Abyss"], correctAnswer: "Titanic", category: "Movies", difficulty: "medium" },
    // ── Hard ──────────────────────────────────────────────────────────────
    { text: "How much did the original 'Jaws' budget cost to make?", options: ["$2 million", "$7 million", "$12 million", "$20 million"], correctAnswer: "$7 million", category: "Movies", difficulty: "hard" },
    { text: "Which actor turned down the role of Indiana Jones?", options: ["Tom Selleck", "Jeff Bridges", "Burt Reynolds", "Nick Nolte"], correctAnswer: "Tom Selleck", category: "Movies", difficulty: "hard" },
    { text: "In 'Blade Runner 2049', what year is the film set in?", options: ["2035", "2049", "2075", "2099"], correctAnswer: "2049", category: "Movies", difficulty: "hard" },
    { text: "Which film director is known as the 'Master of Suspense'?", options: ["Stanley Kubrick", "Alfred Hitchcock", "Brian De Palma", "Roman Polanski"], correctAnswer: "Alfred Hitchcock", category: "Movies", difficulty: "hard" },
    { text: "The movie 'Parasite' is from which country?", options: ["Japan", "China", "South Korea", "Thailand"], correctAnswer: "South Korea", category: "Movies", difficulty: "hard" },
    { text: "What is the name of the fictional language spoken in the 'Avatar' film?", options: ["Klingon", "Elvish", "Na'vi", "Dothraki"], correctAnswer: "Na'vi", category: "Movies", difficulty: "hard" },
    { text: "Which actress played Clarice Starling in 'The Silence of the Lambs'?", options: ["Meryl Streep", "Jodie Foster", "Helen Hunt", "Susan Sarandon"], correctAnswer: "Jodie Foster", category: "Movies", difficulty: "hard" },
    { text: "What was the budget of 'The Blair Witch Project'?", options: ["$200,000", "$500,000", "$1 million", "$5 million"], correctAnswer: "$500,000", category: "Movies", difficulty: "hard" },
    { text: "In 'Goodfellas', what year does the story begin?", options: ["1950", "1955", "1963", "1970"], correctAnswer: "1955", category: "Movies", difficulty: "hard" },
    { text: "Who played the Terminator in the original 1984 film?", options: ["Dolph Lundgren", "Arnold Schwarzenegger", "Sylvester Stallone", "Jean-Claude Van Damme"], correctAnswer: "Arnold Schwarzenegger", category: "Movies", difficulty: "hard" },
    { text: "Which movie has the famous line 'I am your father'?", options: ["Star Wars: A New Hope", "Star Wars: Return of the Jedi", "Star Wars: The Empire Strikes Back", "Star Wars: Revenge of the Sith"], correctAnswer: "Star Wars: The Empire Strikes Back", category: "Movies", difficulty: "hard" },
  ],
  music: [
    // ── Easy ──────────────────────────────────────────────────────────────
    { text: "Who is known as the 'King of Pop'?", options: ["Elvis Presley", "Michael Jackson", "Prince", "Madonna"], correctAnswer: "Michael Jackson", category: "Music", difficulty: "easy" },
    { text: "Which band released the album 'Abbey Road'?", options: ["The Rolling Stones", "The Beatles", "Led Zeppelin", "Pink Floyd"], correctAnswer: "The Beatles", category: "Music", difficulty: "easy" },
    { text: "Who sang 'Purple Rain'?", options: ["Prince", "Michael Jackson", "Whitney Houston", "Stevie Wonder"], correctAnswer: "Prince", category: "Music", difficulty: "easy" },
    { text: "Which band wrote the song 'Bohemian Rhapsody'?", options: ["The Beatles", "Queen", "Led Zeppelin", "Pink Floyd"], correctAnswer: "Queen", category: "Music", difficulty: "easy" },
    { text: "What is the best-selling album of all time?", options: ["Back in Black", "The Dark Side of the Moon", "Thriller", "The Bodyguard"], correctAnswer: "Thriller", category: "Music", difficulty: "easy" },
    { text: "Who is known as the 'Queen of Soul'?", options: ["Diana Ross", "Whitney Houston", "Aretha Franklin", "Etta James"], correctAnswer: "Aretha Franklin", category: "Music", difficulty: "easy" },
    { text: "Which rapper's real name is Marshall Mathers?", options: ["Jay-Z", "Eminem", "Snoop Dogg", "Dr. Dre"], correctAnswer: "Eminem", category: "Music", difficulty: "easy" },
    { text: "What instrument did Jimi Hendrix famously play?", options: ["Drums", "Bass", "Guitar", "Keyboard"], correctAnswer: "Guitar", category: "Music", difficulty: "easy" },
    { text: "Which band's lead singer is Bono?", options: ["Coldplay", "Radiohead", "U2", "R.E.M."], correctAnswer: "U2", category: "Music", difficulty: "easy" },
    { text: "Which K-pop group had a hit with 'Gangnam Style'?", options: ["BTS", "PSY", "BlackPink", "EXO"], correctAnswer: "PSY", category: "Music", difficulty: "easy" },
    { text: "Who composed the 'Four Seasons'?", options: ["Mozart", "Bach", "Vivaldi", "Beethoven"], correctAnswer: "Vivaldi", category: "Music", difficulty: "easy" },
    { text: "Which artist released the album '21' in 2011?", options: ["Adele", "Taylor Swift", "Beyoncé", "Rihanna"], correctAnswer: "Adele", category: "Music", difficulty: "easy" },
    // ── Medium ────────────────────────────────────────────────────────────
    { text: "What instrument does Yo-Yo Ma play?", options: ["Violin", "Piano", "Cello", "Harp"], correctAnswer: "Cello", category: "Music", difficulty: "medium" },
    { text: "What year did MTV launch?", options: ["1979", "1981", "1983", "1985"], correctAnswer: "1981", category: "Music", difficulty: "medium" },
    { text: "What is Lady Gaga's real name?", options: ["Stefani Germanotta", "Stephanie Gaga", "Stella Germaine", "Stacy Gardner"], correctAnswer: "Stefani Germanotta", category: "Music", difficulty: "medium" },
    { text: "Which female artist has the most Billboard Hot 100 hits?", options: ["Madonna", "Rihanna", "Taylor Swift", "Mariah Carey"], correctAnswer: "Taylor Swift", category: "Music", difficulty: "medium" },
    { text: "What was Elvis Presley's first hit song?", options: ["Jailhouse Rock", "Hound Dog", "Heartbreak Hotel", "Love Me Tender"], correctAnswer: "Heartbreak Hotel", category: "Music", difficulty: "medium" },
    { text: "What year did Nirvana release 'Nevermind'?", options: ["1989", "1991", "1993", "1995"], correctAnswer: "1991", category: "Music", difficulty: "medium" },
    { text: "Which country is Shakira from?", options: ["Mexico", "Spain", "Colombia", "Argentina"], correctAnswer: "Colombia", category: "Music", difficulty: "medium" },
    { text: "What genre of music is Kendrick Lamar associated with?", options: ["R&B", "Hip-Hop", "Reggaeton", "Soul"], correctAnswer: "Hip-Hop", category: "Music", difficulty: "medium" },
    { text: "Which rock band is known for the albums 'Dark Side of the Moon' and 'The Wall'?", options: ["Led Zeppelin", "Pink Floyd", "The Who", "Deep Purple"], correctAnswer: "Pink Floyd", category: "Music", difficulty: "medium" },
    { text: "Billie Eilish became the youngest person to win all four major Grammy categories. How old was she?", options: ["16", "17", "18", "19"], correctAnswer: "18", category: "Music", difficulty: "medium" },
    { text: "What artist's real name is Abel Makkonen Tesfaye?", options: ["Drake", "Future", "The Weeknd", "21 Savage"], correctAnswer: "The Weeknd", category: "Music", difficulty: "medium" },
    { text: "Which Beyoncé album was released as a surprise with no prior announcement in 2013?", options: ["Lemonade", "4", "Beyoncé", "Dangerously in Love"], correctAnswer: "Beyoncé", category: "Music", difficulty: "medium" },
    { text: "In what decade did hip-hop originate?", options: ["1960s", "1970s", "1980s", "1990s"], correctAnswer: "1970s", category: "Music", difficulty: "medium" },
    // ── Hard ──────────────────────────────────────────────────────────────
    { text: "Which artist has won the most Grammy Awards in history?", options: ["Beyoncé", "Michael Jackson", "Quincy Jones", "Georg Solti"], correctAnswer: "Beyoncé", category: "Music", difficulty: "hard" },
    { text: "What was the original name of The Beatles?", options: ["The Quarrymen", "The Silver Beetles", "Johnny and the Moondogs", "All of the above — they went through all these names"], correctAnswer: "All of the above — they went through all these names", category: "Music", difficulty: "hard" },
    { text: "How many symphonies did Beethoven complete?", options: ["7", "8", "9", "10"], correctAnswer: "9", category: "Music", difficulty: "hard" },
    { text: "Which rapper has the fastest verse per minute on record (2023)?", options: ["Twista", "Eminem", "Tech N9ne", "Busta Rhymes"], correctAnswer: "Tech N9ne", category: "Music", difficulty: "hard" },
    { text: "What year was Woodstock held?", options: ["1967", "1968", "1969", "1970"], correctAnswer: "1969", category: "Music", difficulty: "hard" },
    { text: "Which classical composer was deaf when he wrote his 9th Symphony?", options: ["Mozart", "Haydn", "Beethoven", "Schubert"], correctAnswer: "Beethoven", category: "Music", difficulty: "hard" },
    { text: "What was the first music video ever played on MTV?", options: ["Thriller by Michael Jackson", "Video Killed the Radio Star by Buggles", "Money for Nothing by Dire Straits", "Bohemian Rhapsody by Queen"], correctAnswer: "Video Killed the Radio Star by Buggles", category: "Music", difficulty: "hard" },
    { text: "Which country produces the most music in its local language by volume?", options: ["USA", "Japan", "India", "South Korea"], correctAnswer: "India", category: "Music", difficulty: "hard" },
    { text: "How many strings does a standard violin have?", options: ["4", "5", "6", "7"], correctAnswer: "4", category: "Music", difficulty: "hard" },
    { text: "Frank Sinatra was born in which US state?", options: ["New York", "New Jersey", "Connecticut", "Pennsylvania"], correctAnswer: "New Jersey", category: "Music", difficulty: "hard" },
    { text: "What is the time signature of 'Money' by Pink Floyd?", options: ["3/4", "5/4", "7/4", "7/8"], correctAnswer: "7/4", category: "Music", difficulty: "hard" },
  ],
  science: [
    // ── Easy ──────────────────────────────────────────────────────────────
    { text: "What is the chemical symbol for gold?", options: ["Go", "Au", "Gd", "Ag"], correctAnswer: "Au", category: "Science", difficulty: "easy" },
    { text: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], correctAnswer: "8", category: "Science", difficulty: "easy" },
    { text: "What is the largest organ in the human body?", options: ["Heart", "Brain", "Liver", "Skin"], correctAnswer: "Skin", category: "Science", difficulty: "easy" },
    { text: "What gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctAnswer: "Carbon Dioxide", category: "Science", difficulty: "easy" },
    { text: "What is the chemical formula for water?", options: ["H2O", "CO2", "O2", "H2O2"], correctAnswer: "H2O", category: "Science", difficulty: "easy" },
    { text: "What is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Platinum"], correctAnswer: "Diamond", category: "Science", difficulty: "easy" },
    { text: "What planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctAnswer: "Mars", category: "Science", difficulty: "easy" },
    { text: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"], correctAnswer: "Mitochondria", category: "Science", difficulty: "easy" },
    { text: "What is the boiling point of water in Celsius?", options: ["90°C", "100°C", "110°C", "120°C"], correctAnswer: "100°C", category: "Science", difficulty: "easy" },
    { text: "What type of animal is a dolphin?", options: ["Fish", "Mammal", "Reptile", "Amphibian"], correctAnswer: "Mammal", category: "Science", difficulty: "easy" },
    { text: "What is the largest planet in our solar system?", options: ["Saturn", "Jupiter", "Neptune", "Uranus"], correctAnswer: "Jupiter", category: "Science", difficulty: "easy" },
    { text: "What is the process by which plants make food?", options: ["Respiration", "Photosynthesis", "Digestion", "Fermentation"], correctAnswer: "Photosynthesis", category: "Science", difficulty: "easy" },
    { text: "How many bones are in the adult human body?", options: ["186", "206", "226", "246"], correctAnswer: "206", category: "Science", difficulty: "easy" },
    // ── Medium ────────────────────────────────────────────────────────────
    { text: "What is the speed of light?", options: ["299,792 km/s", "300,000 km/s", "250,000 km/s", "350,000 km/s"], correctAnswer: "299,792 km/s", category: "Science", difficulty: "medium" },
    { text: "What is the center of an atom called?", options: ["Electron", "Proton", "Neutron", "Nucleus"], correctAnswer: "Nucleus", category: "Science", difficulty: "medium" },
    { text: "What force keeps planets in orbit around the sun?", options: ["Magnetism", "Gravity", "Friction", "Inertia"], correctAnswer: "Gravity", category: "Science", difficulty: "medium" },
    { text: "What is the most abundant gas in Earth's atmosphere?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correctAnswer: "Nitrogen", category: "Science", difficulty: "medium" },
    { text: "How long does it take light from the Sun to reach Earth?", options: ["8 seconds", "8 minutes", "8 hours", "8 days"], correctAnswer: "8 minutes", category: "Science", difficulty: "medium" },
    { text: "What is the symbol for the element oxygen?", options: ["O", "Ox", "O2", "Om"], correctAnswer: "O", category: "Science", difficulty: "medium" },
    { text: "What is the study of stars and planets called?", options: ["Geology", "Biology", "Astronomy", "Meteorology"], correctAnswer: "Astronomy", category: "Science", difficulty: "medium" },
    { text: "At what temperature are Fahrenheit and Celsius the same?", options: ["-32°", "-40°", "-48°", "-55°"], correctAnswer: "-40°", category: "Science", difficulty: "medium" },
    { text: "What is the smallest unit of matter?", options: ["Atom", "Molecule", "Electron", "Quark"], correctAnswer: "Atom", category: "Science", difficulty: "medium" },
    { text: "How many chambers does a human heart have?", options: ["2", "3", "4", "6"], correctAnswer: "4", category: "Science", difficulty: "medium" },
    { text: "What is the chemical symbol for iron?", options: ["Ir", "Fe", "In", "Io"], correctAnswer: "Fe", category: "Science", difficulty: "medium" },
    { text: "What is the name of the force that opposes relative motion?", options: ["Gravity", "Friction", "Tension", "Normal force"], correctAnswer: "Friction", category: "Science", difficulty: "medium" },
    { text: "What is the pH level of pure water?", options: ["5", "6", "7", "8"], correctAnswer: "7", category: "Science", difficulty: "medium" },
    { text: "How many teeth does an adult human have?", options: ["28", "30", "32", "34"], correctAnswer: "32", category: "Science", difficulty: "medium" },
    // ── Hard ──────────────────────────────────────────────────────────────
    { text: "What is the half-life of carbon-14?", options: ["1,140 years", "5,730 years", "14,000 years", "57,300 years"], correctAnswer: "5,730 years", category: "Science", difficulty: "hard" },
    { text: "What is the name of the theoretical boundary around a black hole?", options: ["Singularity", "Event Horizon", "Schwarzschild Radius", "Photon Sphere"], correctAnswer: "Event Horizon", category: "Science", difficulty: "hard" },
    { text: "How many chromosomes do humans have?", options: ["22", "44", "46", "48"], correctAnswer: "46", category: "Science", difficulty: "hard" },
    { text: "What is the chemical formula for table salt?", options: ["NaCl", "KCl", "CaCl", "MgCl"], correctAnswer: "NaCl", category: "Science", difficulty: "hard" },
    { text: "Which scientist proposed the theory of relativity?", options: ["Isaac Newton", "Niels Bohr", "Albert Einstein", "Max Planck"], correctAnswer: "Albert Einstein", category: "Science", difficulty: "hard" },
    { text: "What is the name of the protein that carries oxygen in red blood cells?", options: ["Myosin", "Keratin", "Hemoglobin", "Collagen"], correctAnswer: "Hemoglobin", category: "Science", difficulty: "hard" },
    { text: "What is Newton's Third Law of Motion?", options: ["Objects in motion stay in motion", "F = ma", "Every action has an equal and opposite reaction", "Gravity is proportional to mass"], correctAnswer: "Every action has an equal and opposite reaction", category: "Science", difficulty: "hard" },
    { text: "What is the approximate age of the universe?", options: ["4.5 billion years", "10 billion years", "13.8 billion years", "20 billion years"], correctAnswer: "13.8 billion years", category: "Science", difficulty: "hard" },
    { text: "What type of rock is formed from cooled magma?", options: ["Sedimentary", "Metamorphic", "Igneous", "Limestone"], correctAnswer: "Igneous", category: "Science", difficulty: "hard" },
    { text: "Which element has the atomic number 79?", options: ["Silver", "Platinum", "Gold", "Mercury"], correctAnswer: "Gold", category: "Science", difficulty: "hard" },
  ],
  history: [
    // ── Easy ──────────────────────────────────────────────────────────────
    { text: "In what year did World War II end?", options: ["1943", "1944", "1945", "1946"], correctAnswer: "1945", category: "History", difficulty: "easy" },
    { text: "Who was the first President of the United States?", options: ["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"], correctAnswer: "George Washington", category: "History", difficulty: "easy" },
    { text: "What year did the Berlin Wall fall?", options: ["1987", "1988", "1989", "1990"], correctAnswer: "1989", category: "History", difficulty: "easy" },
    { text: "Who painted the Mona Lisa?", options: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"], correctAnswer: "Leonardo da Vinci", category: "History", difficulty: "easy" },
    { text: "Who was the first man to walk on the moon?", options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "John Glenn"], correctAnswer: "Neil Armstrong", category: "History", difficulty: "easy" },
    { text: "What year did the Titanic sink?", options: ["1910", "1912", "1914", "1916"], correctAnswer: "1912", category: "History", difficulty: "easy" },
    { text: "Who was the British Prime Minister during World War II?", options: ["Neville Chamberlain", "Winston Churchill", "Clement Attlee", "Anthony Eden"], correctAnswer: "Winston Churchill", category: "History", difficulty: "easy" },
    { text: "What year did the United States declare independence?", options: ["1774", "1775", "1776", "1777"], correctAnswer: "1776", category: "History", difficulty: "easy" },
    { text: "Which civilization built the pyramids?", options: ["Romans", "Greeks", "Egyptians", "Persians"], correctAnswer: "Egyptians", category: "History", difficulty: "easy" },
    { text: "Who invented the telephone?", options: ["Thomas Edison", "Nikola Tesla", "Alexander Graham Bell", "Guglielmo Marconi"], correctAnswer: "Alexander Graham Bell", category: "History", difficulty: "easy" },
    // ── Medium ────────────────────────────────────────────────────────────
    { text: "Which ancient wonder still stands today?", options: ["Hanging Gardens", "Colossus of Rhodes", "Great Pyramid of Giza", "Lighthouse of Alexandria"], correctAnswer: "Great Pyramid of Giza", category: "History", difficulty: "medium" },
    { text: "What year did Christopher Columbus reach the Americas?", options: ["1492", "1500", "1520", "1450"], correctAnswer: "1492", category: "History", difficulty: "medium" },
    { text: "Which empire built Machu Picchu?", options: ["Aztec", "Maya", "Inca", "Olmec"], correctAnswer: "Inca", category: "History", difficulty: "medium" },
    { text: "What was the name of the first atomic bomb dropped on Japan?", options: ["Fat Man", "Little Boy", "Trinity", "Big Ivan"], correctAnswer: "Little Boy", category: "History", difficulty: "medium" },
    { text: "Who was known as the 'Iron Lady'?", options: ["Margaret Thatcher", "Indira Gandhi", "Golda Meir", "Angela Merkel"], correctAnswer: "Margaret Thatcher", category: "History", difficulty: "medium" },
    { text: "What was the name of the ship on which Charles Darwin sailed?", options: ["HMS Victory", "HMS Beagle", "Santa Maria", "Mayflower"], correctAnswer: "HMS Beagle", category: "History", difficulty: "medium" },
    { text: "Which war lasted from 1950 to 1953?", options: ["Vietnam War", "Korean War", "Cold War", "Gulf War"], correctAnswer: "Korean War", category: "History", difficulty: "medium" },
    { text: "Who wrote 'The Communist Manifesto'?", options: ["Vladimir Lenin", "Joseph Stalin", "Karl Marx", "Leon Trotsky"], correctAnswer: "Karl Marx", category: "History", difficulty: "medium" },
    { text: "What year did the Soviet Union collapse?", options: ["1989", "1990", "1991", "1992"], correctAnswer: "1991", category: "History", difficulty: "medium" },
    { text: "What ancient city was destroyed by a volcano in 79 AD?", options: ["Athens", "Rome", "Pompeii", "Carthage"], correctAnswer: "Pompeii", category: "History", difficulty: "medium" },
    { text: "Who led the Cuban Revolution?", options: ["Che Guevara", "Fidel Castro", "Raúl Castro", "Camilo Cienfuegos"], correctAnswer: "Fidel Castro", category: "History", difficulty: "medium" },
    { text: "In which year did World War I begin?", options: ["1912", "1914", "1916", "1918"], correctAnswer: "1914", category: "History", difficulty: "medium" },
    { text: "Who was the first female Prime Minister of the United Kingdom?", options: ["Theresa May", "Angela Merkel", "Margaret Thatcher", "Golda Meir"], correctAnswer: "Margaret Thatcher", category: "History", difficulty: "medium" },
    { text: "What was the name of the plan for Western European recovery after World War II?", options: ["Truman Doctrine", "Lend-Lease Act", "Marshall Plan", "Monroe Doctrine"], correctAnswer: "Marshall Plan", category: "History", difficulty: "medium" },
    // ── Hard ──────────────────────────────────────────────────────────────
    { text: "In what year did the Black Death reach Europe?", options: ["1248", "1347", "1400", "1452"], correctAnswer: "1347", category: "History", difficulty: "hard" },
    { text: "Who was the last Tsar of Russia?", options: ["Alexander III", "Nicholas II", "Peter the Great", "Ivan the Terrible"], correctAnswer: "Nicholas II", category: "History", difficulty: "hard" },
    { text: "What was the name of the battle that ended Napoleon's rule?", options: ["Battle of Trafalgar", "Battle of Austerlitz", "Battle of Waterloo", "Battle of Leipzig"], correctAnswer: "Battle of Waterloo", category: "History", difficulty: "hard" },
    { text: "In what year did the first moon landing occur?", options: ["1965", "1967", "1969", "1971"], correctAnswer: "1969", category: "History", difficulty: "hard" },
    { text: "The Magna Carta was signed in which year?", options: ["1066", "1215", "1381", "1485"], correctAnswer: "1215", category: "History", difficulty: "hard" },
    { text: "Who was the first European to sail around the world?", options: ["Christopher Columbus", "Vasco da Gama", "Ferdinand Magellan", "Francis Drake"], correctAnswer: "Ferdinand Magellan", category: "History", difficulty: "hard" },
    { text: "What country was the first to give women the right to vote nationally?", options: ["USA", "UK", "New Zealand", "Australia"], correctAnswer: "New Zealand", category: "History", difficulty: "hard" },
    { text: "Who was the longest-reigning British monarch?", options: ["Queen Victoria", "King George III", "Queen Elizabeth II", "King Henry VIII"], correctAnswer: "Queen Elizabeth II", category: "History", difficulty: "hard" },
    { text: "The Persian Empire was founded by which ruler?", options: ["Darius I", "Xerxes I", "Cyrus the Great", "Cambyses II"], correctAnswer: "Cyrus the Great", category: "History", difficulty: "hard" },
    { text: "What was the name of the secret US program to develop nuclear weapons in WWII?", options: ["Operation Overlord", "Manhattan Project", "Operation Neptune", "Project Epsilon"], correctAnswer: "Manhattan Project", category: "History", difficulty: "hard" },
    { text: "In what city was Archduke Franz Ferdinand assassinated, triggering WWI?", options: ["Vienna", "Berlin", "Sarajevo", "Prague"], correctAnswer: "Sarajevo", category: "History", difficulty: "hard" },
  ],
  geography: [
    // ── Easy ──────────────────────────────────────────────────────────────
    { text: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Brisbane"], correctAnswer: "Canberra", category: "Geography", difficulty: "easy" },
    { text: "How many continents are there?", options: ["5", "6", "7", "8"], correctAnswer: "7", category: "Geography", difficulty: "easy" },
    { text: "What is the smallest country in the world?", options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], correctAnswer: "Vatican City", category: "Geography", difficulty: "easy" },
    { text: "What is the highest mountain in the world?", options: ["K2", "Mount Everest", "Kangchenjunga", "Makalu"], correctAnswer: "Mount Everest", category: "Geography", difficulty: "easy" },
    { text: "Which ocean is the largest?", options: ["Atlantic", "Indian", "Pacific", "Arctic"], correctAnswer: "Pacific", category: "Geography", difficulty: "easy" },
    { text: "What is the capital of Japan?", options: ["Osaka", "Kyoto", "Tokyo", "Yokohama"], correctAnswer: "Tokyo", category: "Geography", difficulty: "easy" },
    { text: "What is the capital of Canada?", options: ["Toronto", "Vancouver", "Montreal", "Ottawa"], correctAnswer: "Ottawa", category: "Geography", difficulty: "easy" },
    { text: "What is the capital of Brazil?", options: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"], correctAnswer: "Brasília", category: "Geography", difficulty: "easy" },
    { text: "What is the southernmost continent?", options: ["Australia", "South America", "Africa", "Antarctica"], correctAnswer: "Antarctica", category: "Geography", difficulty: "easy" },
    { text: "Which river is the longest in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correctAnswer: "Nile", category: "Geography", difficulty: "easy" },
    // ── Medium ────────────────────────────────────────────────────────────
    { text: "Which desert is the largest in the world?", options: ["Sahara", "Arabian", "Gobi", "Antarctic"], correctAnswer: "Antarctic", category: "Geography", difficulty: "medium" },
    { text: "Which country has the most natural lakes?", options: ["USA", "Canada", "Russia", "Finland"], correctAnswer: "Canada", category: "Geography", difficulty: "medium" },
    { text: "Which country is both in Europe and Asia?", options: ["Russia", "Turkey", "Kazakhstan", "All of the above"], correctAnswer: "All of the above", category: "Geography", difficulty: "medium" },
    { text: "What is the longest river in Europe?", options: ["Danube", "Rhine", "Volga", "Thames"], correctAnswer: "Volga", category: "Geography", difficulty: "medium" },
    { text: "Which country has the most time zones?", options: ["USA", "Russia", "France", "China"], correctAnswer: "France", category: "Geography", difficulty: "medium" },
    { text: "Which mountain range separates Europe and Asia?", options: ["Himalayas", "Alps", "Ural Mountains", "Rocky Mountains"], correctAnswer: "Ural Mountains", category: "Geography", difficulty: "medium" },
    { text: "What is the largest island in the world?", options: ["Australia", "Greenland", "New Guinea", "Borneo"], correctAnswer: "Greenland", category: "Geography", difficulty: "medium" },
    { text: "Which country has the longest coastline?", options: ["Australia", "Russia", "Canada", "Indonesia"], correctAnswer: "Canada", category: "Geography", difficulty: "medium" },
    { text: "What is the driest place on Earth?", options: ["Death Valley", "Sahara Desert", "Atacama Desert", "Arabian Desert"], correctAnswer: "Atacama Desert", category: "Geography", difficulty: "medium" },
    { text: "Which European capital is known as the 'City of Love'?", options: ["Rome", "Paris", "Venice", "Vienna"], correctAnswer: "Paris", category: "Geography", difficulty: "medium" },
    { text: "What is the capital of South Africa (seat of government)?", options: ["Cape Town", "Johannesburg", "Pretoria", "Durban"], correctAnswer: "Pretoria", category: "Geography", difficulty: "medium" },
    { text: "What percentage of Earth's surface is covered by water?", options: ["51%", "61%", "71%", "81%"], correctAnswer: "71%", category: "Geography", difficulty: "medium" },
    { text: "Which country has the world's largest rainforest?", options: ["Colombia", "Peru", "Brazil", "Bolivia"], correctAnswer: "Brazil", category: "Geography", difficulty: "medium" },
    { text: "What is the capital of Egypt?", options: ["Alexandria", "Cairo", "Luxor", "Giza"], correctAnswer: "Cairo", category: "Geography", difficulty: "medium" },
    { text: "Which US state has the longest coastline?", options: ["Florida", "California", "Texas", "Alaska"], correctAnswer: "Alaska", category: "Geography", difficulty: "medium" },
    // ── Hard ──────────────────────────────────────────────────────────────
    { text: "What is the capital of Kazakhstan?", options: ["Almaty", "Astana (Nur-Sultan)", "Shymkent", "Aktobe"], correctAnswer: "Astana (Nur-Sultan)", category: "Geography", difficulty: "hard" },
    { text: "What is the deepest lake in the world?", options: ["Lake Superior", "Caspian Sea", "Lake Baikal", "Lake Tanganyika"], correctAnswer: "Lake Baikal", category: "Geography", difficulty: "hard" },
    { text: "Which country has the most pyramids?", options: ["Egypt", "Mexico", "Sudan", "Peru"], correctAnswer: "Sudan", category: "Geography", difficulty: "hard" },
    { text: "What is the capital of Iceland?", options: ["Bergen", "Reykjavik", "Tromsø", "Nuuk"], correctAnswer: "Reykjavik", category: "Geography", difficulty: "hard" },
    { text: "How many countries share a border with China?", options: ["10", "12", "14", "16"], correctAnswer: "14", category: "Geography", difficulty: "hard" },
    { text: "What is the name of the deepest point in the world's oceans?", options: ["Java Trench", "Mariana Trench", "Puerto Rico Trench", "Tonga Trench"], correctAnswer: "Mariana Trench", category: "Geography", difficulty: "hard" },
    { text: "Which country contains the most UNESCO World Heritage Sites?", options: ["China", "Italy", "Spain", "France"], correctAnswer: "Italy", category: "Geography", difficulty: "hard" },
    { text: "What is the smallest continent by land area?", options: ["Europe", "Antarctica", "Australia", "South America"], correctAnswer: "Australia", category: "Geography", difficulty: "hard" },
    { text: "Which African country has the largest population?", options: ["Ethiopia", "Egypt", "Nigeria", "DRC"], correctAnswer: "Nigeria", category: "Geography", difficulty: "hard" },
    { text: "What is the capital of Myanmar (Burma)?", options: ["Rangoon", "Mandalay", "Naypyidaw", "Bagan"], correctAnswer: "Naypyidaw", category: "Geography", difficulty: "hard" },
  ],
  "pop-culture": [
    // ── Easy ──────────────────────────────────────────────────────────────
    { text: "Who is the author of Harry Potter?", options: ["J.R.R. Tolkien", "J.K. Rowling", "Stephen King", "George R.R. Martin"], correctAnswer: "J.K. Rowling", category: "Pop Culture", difficulty: "easy" },
    { text: "Which video game character is known for eating mushrooms?", options: ["Sonic", "Mario", "Link", "Pac-Man"], correctAnswer: "Mario", category: "Pop Culture", difficulty: "easy" },
    { text: "What is the name of the coffee shop in 'Friends'?", options: ["Central Perk", "Java Joe's", "Brew Haven", "Coffee Spot"], correctAnswer: "Central Perk", category: "Pop Culture", difficulty: "easy" },
    { text: "What does 'LOL' stand for?", options: ["Lots of Love", "Laugh Out Loud", "Living Online", "Loss of Life"], correctAnswer: "Laugh Out Loud", category: "Pop Culture", difficulty: "easy" },
    { text: "Who voiced Woody in 'Toy Story'?", options: ["Tim Allen", "Tom Hanks", "Bill Murray", "Robin Williams"], correctAnswer: "Tom Hanks", category: "Pop Culture", difficulty: "easy" },
    { text: "Which TV show features the character 'Eleven'?", options: ["The Umbrella Academy", "Stranger Things", "The Boys", "Dark"], correctAnswer: "Stranger Things", category: "Pop Culture", difficulty: "easy" },
    { text: "What year was Facebook founded?", options: ["2002", "2004", "2006", "2008"], correctAnswer: "2004", category: "Pop Culture", difficulty: "easy" },
    { text: "What year did the first iPhone release?", options: ["2005", "2007", "2009", "2011"], correctAnswer: "2007", category: "Pop Culture", difficulty: "easy" },
    { text: "Which app is known for short-form videos?", options: ["Instagram", "Snapchat", "TikTok", "Vine"], correctAnswer: "TikTok", category: "Pop Culture", difficulty: "easy" },
    { text: "Which streaming service produces 'The Mandalorian'?", options: ["Netflix", "Hulu", "Disney+", "Amazon Prime"], correctAnswer: "Disney+", category: "Pop Culture", difficulty: "easy" },
    // ── Medium ────────────────────────────────────────────────────────────
    { text: "What is the most-watched series on Netflix globally?", options: ["Stranger Things", "Squid Game", "Wednesday", "The Crown"], correctAnswer: "Squid Game", category: "Pop Culture", difficulty: "medium" },
    { text: "Who is the most followed person on Instagram?", options: ["Cristiano Ronaldo", "Kylie Jenner", "Selena Gomez", "The Rock"], correctAnswer: "Cristiano Ronaldo", category: "Pop Culture", difficulty: "medium" },
    { text: "Which celebrity couple is known as 'Brangelina'?", options: ["Brad Pitt & Jennifer Aniston", "Brad Pitt & Angelina Jolie", "Ben Affleck & Jennifer Lopez", "Bradley Cooper & Lady Gaga"], correctAnswer: "Brad Pitt & Angelina Jolie", category: "Pop Culture", difficulty: "medium" },
    { text: "What is the name of the fictional kingdom in 'Frozen'?", options: ["Atlantis", "Narnia", "Arendelle", "Camelot"], correctAnswer: "Arendelle", category: "Pop Culture", difficulty: "medium" },
    { text: "What was Twitter's original character limit?", options: ["100", "140", "200", "280"], correctAnswer: "140", category: "Pop Culture", difficulty: "medium" },
    { text: "What is the highest-grossing video game franchise?", options: ["Pokémon", "Mario", "Call of Duty", "Grand Theft Auto"], correctAnswer: "Pokémon", category: "Pop Culture", difficulty: "medium" },
    { text: "Which artist performed at the 2023 Super Bowl halftime show?", options: ["The Weeknd", "Rihanna", "Beyoncé", "Lady Gaga"], correctAnswer: "Rihanna", category: "Pop Culture", difficulty: "medium" },
    { text: "What is the most subscribed YouTube channel?", options: ["PewDiePie", "MrBeast", "T-Series", "Cocomelon"], correctAnswer: "T-Series", category: "Pop Culture", difficulty: "medium" },
    { text: "What social media platform uses a bird as its logo?", options: ["Facebook", "Instagram", "Twitter", "Snapchat"], correctAnswer: "Twitter", category: "Pop Culture", difficulty: "medium" },
    { text: "In 'The Office' US version, what paper company do they work for?", options: ["Wernham Hogg", "Dunder Mifflin", "Initech", "Vandelay Industries"], correctAnswer: "Dunder Mifflin", category: "Pop Culture", difficulty: "medium" },
    { text: "Which show popularized the phrase 'Winter is Coming'?", options: ["The Witcher", "Game of Thrones", "The Last Kingdom", "Vikings"], correctAnswer: "Game of Thrones", category: "Pop Culture", difficulty: "medium" },
    { text: "What year did the TV show 'Breaking Bad' premiere?", options: ["2006", "2007", "2008", "2009"], correctAnswer: "2008", category: "Pop Culture", difficulty: "medium" },
    { text: "What is the name of Tony Stark's AI assistant in the Iron Man films?", options: ["JARVIS", "FRIDAY", "KAREN", "EDITH"], correctAnswer: "JARVIS", category: "Pop Culture", difficulty: "medium" },
    { text: "What is the name of Baby Yoda's species?", options: ["Yoda", "The Child", "Unknown", "Grogu"], correctAnswer: "Unknown", category: "Pop Culture", difficulty: "medium" },
    // ── Hard ──────────────────────────────────────────────────────────────
    { text: "What was the first video to reach 1 billion views on YouTube?", options: ["Baby by Justin Bieber", "Gangnam Style by PSY", "Despacito by Luis Fonsi", "Shape of You by Ed Sheeran"], correctAnswer: "Gangnam Style by PSY", category: "Pop Culture", difficulty: "hard" },
    { text: "What year was Reddit founded?", options: ["2003", "2004", "2005", "2006"], correctAnswer: "2005", category: "Pop Culture", difficulty: "hard" },
    { text: "Which show holds the record for most Emmy wins in a single year?", options: ["Game of Thrones", "The Crown", "Succession", "Schitt's Creek"], correctAnswer: "Schitt's Creek", category: "Pop Culture", difficulty: "hard" },
    { text: "What was the original name of Snapchat during development?", options: ["Flashchat", "Picaboo", "Snappy", "FadeAway"], correctAnswer: "Picaboo", category: "Pop Culture", difficulty: "hard" },
    { text: "Who created the TV show 'Black Mirror'?", options: ["Joss Whedon", "Charlie Brooker", "J.J. Abrams", "Ryan Murphy"], correctAnswer: "Charlie Brooker", category: "Pop Culture", difficulty: "hard" },
    { text: "What is the real name of music producer DJ Khaled?", options: ["Khaled Mohamed Khaled", "John Khaled", "Ahmed Al-Rashid", "Khalid Al-Asad"], correctAnswer: "Khaled Mohamed Khaled", category: "Pop Culture", difficulty: "hard" },
    { text: "What was the first video game to be inducted into the World Video Game Hall of Fame?", options: ["Pong", "Pac-Man", "Super Mario Bros.", "Tetris"], correctAnswer: "Pong", category: "Pop Culture", difficulty: "hard" },
    { text: "Which Marvel character was the first to have their own Netflix series?", options: ["Luke Cage", "Jessica Jones", "Daredevil", "Iron Fist"], correctAnswer: "Daredevil", category: "Pop Culture", difficulty: "hard" },
    { text: "What iconic TV moment became known as 'The Red Wedding'?", options: ["The Sopranos finale", "Game of Thrones Season 3", "Grey's Anatomy Season 6", "Westworld Season 1"], correctAnswer: "Game of Thrones Season 3", category: "Pop Culture", difficulty: "hard" },
  ],
  "food-drink": [
    // ── Easy ──────────────────────────────────────────────────────────────
    { text: "What is the main ingredient in guacamole?", options: ["Tomato", "Avocado", "Pepper", "Onion"], correctAnswer: "Avocado", category: "Food & Drink", difficulty: "easy" },
    { text: "Which country invented pizza?", options: ["France", "Greece", "Italy", "Spain"], correctAnswer: "Italy", category: "Food & Drink", difficulty: "easy" },
    { text: "What type of alcohol is made from agave?", options: ["Rum", "Tequila", "Vodka", "Gin"], correctAnswer: "Tequila", category: "Food & Drink", difficulty: "easy" },
    { text: "Which cheese is traditionally used on pizza?", options: ["Cheddar", "Mozzarella", "Parmesan", "Gouda"], correctAnswer: "Mozzarella", category: "Food & Drink", difficulty: "easy" },
    { text: "What is the most consumed beverage in the world after water?", options: ["Coffee", "Tea", "Beer", "Milk"], correctAnswer: "Tea", category: "Food & Drink", difficulty: "easy" },
    { text: "What is the main ingredient in hummus?", options: ["Lentils", "Chickpeas", "Black beans", "Kidney beans"], correctAnswer: "Chickpeas", category: "Food & Drink", difficulty: "easy" },
    { text: "What is the base spirit in a Margarita?", options: ["Vodka", "Rum", "Tequila", "Gin"], correctAnswer: "Tequila", category: "Food & Drink", difficulty: "easy" },
    { text: "Which fruit is known as the 'king of fruits'?", options: ["Mango", "Durian", "Pineapple", "Papaya"], correctAnswer: "Durian", category: "Food & Drink", difficulty: "easy" },
    { text: "What type of pasta is shaped like a butterfly?", options: ["Penne", "Rigatoni", "Farfalle", "Fusilli"], correctAnswer: "Farfalle", category: "Food & Drink", difficulty: "easy" },
    { text: "What is the main ingredient in traditional Japanese sake?", options: ["Rice", "Wheat", "Barley", "Corn"], correctAnswer: "Rice", category: "Food & Drink", difficulty: "easy" },
    // ── Medium ────────────────────────────────────────────────────────────
    { text: "Which country is the origin of the cocktail Mojito?", options: ["Mexico", "Cuba", "Brazil", "Spain"], correctAnswer: "Cuba", category: "Food & Drink", difficulty: "medium" },
    { text: "What is the most expensive spice in the world?", options: ["Vanilla", "Saffron", "Cardamom", "Cinnamon"], correctAnswer: "Saffron", category: "Food & Drink", difficulty: "medium" },
    { text: "Which fruit has the highest vitamin C content?", options: ["Orange", "Lemon", "Kiwi", "Guava"], correctAnswer: "Guava", category: "Food & Drink", difficulty: "medium" },
    { text: "What is the main ingredient in Japanese miso soup?", options: ["Soy sauce", "Miso paste", "Rice", "Fish"], correctAnswer: "Miso paste", category: "Food & Drink", difficulty: "medium" },
    { text: "What is the national dish of Spain?", options: ["Paella", "Tapas", "Gazpacho", "Churros"], correctAnswer: "Paella", category: "Food & Drink", difficulty: "medium" },
    { text: "Which nut is used to make marzipan?", options: ["Walnut", "Cashew", "Almond", "Pistachio"], correctAnswer: "Almond", category: "Food & Drink", difficulty: "medium" },
    { text: "Which vegetable is used to make sauerkraut?", options: ["Carrot", "Cabbage", "Cucumber", "Beet"], correctAnswer: "Cabbage", category: "Food & Drink", difficulty: "medium" },
    { text: "What is the main ingredient in tahini?", options: ["Chickpeas", "Peanuts", "Sesame seeds", "Sunflower seeds"], correctAnswer: "Sesame seeds", category: "Food & Drink", difficulty: "medium" },
    { text: "Which country consumes the most coffee per capita?", options: ["USA", "Italy", "Finland", "Brazil"], correctAnswer: "Finland", category: "Food & Drink", difficulty: "medium" },
    { text: "What classic gin cocktail is made with lime juice and simple syrup?", options: ["Moscow Mule", "Tom Collins", "Gimlet", "Singapore Sling"], correctAnswer: "Gimlet", category: "Food & Drink", difficulty: "medium" },
    { text: "What is the main alcoholic ingredient in a Cosmopolitan?", options: ["Gin", "Tequila", "Rum", "Vodka"], correctAnswer: "Vodka", category: "Food & Drink", difficulty: "medium" },
    { text: "What type of wine is Champagne?", options: ["Still", "Fortified", "Sparkling", "Dessert"], correctAnswer: "Sparkling", category: "Food & Drink", difficulty: "medium" },
    { text: "What is the popular Japanese dish of raw fish on rice called?", options: ["Sashimi", "Sushi", "Tempura", "Ramen"], correctAnswer: "Sushi", category: "Food & Drink", difficulty: "medium" },
    { text: "Which grape variety is Champagne traditionally made from?", options: ["Chardonnay, Pinot Noir, and Meunier", "Riesling and Pinot Grigio", "Sauvignon Blanc and Viognier", "Grenache and Syrah"], correctAnswer: "Chardonnay, Pinot Noir, and Meunier", category: "Food & Drink", difficulty: "medium" },
    // ── Hard ──────────────────────────────────────────────────────────────
    { text: "What is Scotch whisky aged in if it comes from a distillery that previously held bourbon?", options: ["New oak barrels", "Used bourbon barrels", "Sherry casks", "Port pipes"], correctAnswer: "Used bourbon barrels", category: "Food & Drink", difficulty: "hard" },
    { text: "What color is Coca-Cola originally?", options: ["Brown", "Black", "Green", "Red"], correctAnswer: "Brown", category: "Food & Drink", difficulty: "hard" },
    { text: "Which cheese has a protected designation of origin from the Champagne region?", options: ["Brie de Meaux", "Camembert", "Langres", "Chaource"], correctAnswer: "Langres", category: "Food & Drink", difficulty: "hard" },
    { text: "What is the alcohol content of most standard spirits (ABV)?", options: ["20%", "30%", "40%", "50%"], correctAnswer: "40%", category: "Food & Drink", difficulty: "hard" },
    { text: "Which country produces the most wine by volume?", options: ["France", "Italy", "Spain", "USA"], correctAnswer: "Italy", category: "Food & Drink", difficulty: "hard" },
    { text: "What is the term for removing the fizz from sparkling wine during production by removing the dead yeast?", options: ["Malolactic fermentation", "Riddling", "Disgorgement", "Dosage"], correctAnswer: "Disgorgement", category: "Food & Drink", difficulty: "hard" },
    { text: "What grain is Bourbon whiskey primarily made from?", options: ["Barley", "Wheat", "Corn", "Rye"], correctAnswer: "Corn", category: "Food & Drink", difficulty: "hard" },
    { text: "What is umami sometimes called?", options: ["The 5th taste", "The hidden flavor", "The savory taste", "All of the above"], correctAnswer: "All of the above", category: "Food & Drink", difficulty: "hard" },
    { text: "Which country invented croissants?", options: ["France", "Austria", "Germany", "Belgium"], correctAnswer: "Austria", category: "Food & Drink", difficulty: "hard" },
  ],
  technology: [
    // ── Easy ──────────────────────────────────────────────────────────────
    { text: "Who is the founder of Microsoft?", options: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Elon Musk"], correctAnswer: "Bill Gates", category: "Technology", difficulty: "easy" },
    { text: "What does 'HTTP' stand for?", options: ["HyperText Transfer Protocol", "High Tech Transfer Protocol", "Home Tool Transfer Protocol", "HyperText Transmission Process"], correctAnswer: "HyperText Transfer Protocol", category: "Technology", difficulty: "easy" },
    { text: "What does 'CPU' stand for?", options: ["Central Processing Unit", "Computer Personal Unit", "Central Processor Universal", "Computer Processing Utility"], correctAnswer: "Central Processing Unit", category: "Technology", difficulty: "easy" },
    { text: "What is the name of Apple's virtual assistant?", options: ["Alexa", "Cortana", "Siri", "Google Assistant"], correctAnswer: "Siri", category: "Technology", difficulty: "easy" },
    { text: "What does 'AI' stand for?", options: ["Automated Intelligence", "Artificial Intelligence", "Advanced Interface", "Automatic Integration"], correctAnswer: "Artificial Intelligence", category: "Technology", difficulty: "easy" },
    { text: "Which company developed the Android operating system?", options: ["Apple", "Microsoft", "Google", "Samsung"], correctAnswer: "Google", category: "Technology", difficulty: "easy" },
    { text: "What is the name of Amazon's cloud computing platform?", options: ["Azure", "AWS", "Google Cloud", "iCloud"], correctAnswer: "AWS", category: "Technology", difficulty: "easy" },
    { text: "What does 'RAM' stand for?", options: ["Random Access Memory", "Rapid Access Memory", "Read Access Memory", "Remote Access Memory"], correctAnswer: "Random Access Memory", category: "Technology", difficulty: "easy" },
    { text: "Which company developed the Windows operating system?", options: ["Apple", "Google", "Microsoft", "IBM"], correctAnswer: "Microsoft", category: "Technology", difficulty: "easy" },
    { text: "What is the name of Google's web browser?", options: ["Firefox", "Safari", "Chrome", "Edge"], correctAnswer: "Chrome", category: "Technology", difficulty: "easy" },
    { text: "Which company created the PlayStation?", options: ["Microsoft", "Nintendo", "Sony", "Sega"], correctAnswer: "Sony", category: "Technology", difficulty: "easy" },
    // ── Medium ────────────────────────────────────────────────────────────
    { text: "Which programming language is known for its use in web development?", options: ["Python", "JavaScript", "C++", "Swift"], correctAnswer: "JavaScript", category: "Technology", difficulty: "medium" },
    { text: "What does 'URL' stand for?", options: ["Universal Resource Locator", "Uniform Resource Locator", "Universal Reference Link", "Uniform Reference Locator"], correctAnswer: "Uniform Resource Locator", category: "Technology", difficulty: "medium" },
    { text: "Which company owns Instagram?", options: ["Twitter", "Google", "Meta (Facebook)", "Snapchat"], correctAnswer: "Meta (Facebook)", category: "Technology", difficulty: "medium" },
    { text: "What does 'USB' stand for?", options: ["Universal Serial Bus", "Universal System Bus", "Unified Serial Bus", "Universal Service Bus"], correctAnswer: "Universal Serial Bus", category: "Technology", difficulty: "medium" },
    { text: "What year was the first iPhone released?", options: ["2005", "2007", "2009", "2011"], correctAnswer: "2007", category: "Technology", difficulty: "medium" },
    { text: "Who founded Tesla Motors?", options: ["Bill Gates", "Steve Jobs", "Elon Musk", "Jeff Bezos"], correctAnswer: "Elon Musk", category: "Technology", difficulty: "medium" },
    { text: "What is the maximum capacity of a standard Blu-ray disc?", options: ["25 GB", "50 GB", "100 GB", "200 GB"], correctAnswer: "50 GB", category: "Technology", difficulty: "medium" },
    { text: "What social media platform has a maximum post length of 280 characters?", options: ["Facebook", "Instagram", "Twitter", "LinkedIn"], correctAnswer: "Twitter", category: "Technology", difficulty: "medium" },
    { text: "What is the most popular programming language in 2023?", options: ["Java", "Python", "C++", "JavaScript"], correctAnswer: "Python", category: "Technology", difficulty: "medium" },
    { text: "Which company owns YouTube?", options: ["Facebook", "Apple", "Google", "Amazon"], correctAnswer: "Google", category: "Technology", difficulty: "medium" },
    { text: "What does 'VPN' stand for?", options: ["Virtual Private Network", "Very Private Node", "Virtual Public Network", "Verified Private Node"], correctAnswer: "Virtual Private Network", category: "Technology", difficulty: "medium" },
    { text: "What is the most popular open-source version control system?", options: ["SVN", "Git", "Mercurial", "CVS"], correctAnswer: "Git", category: "Technology", difficulty: "medium" },
    { text: "What company makes the M-series chips used in modern Macs?", options: ["Intel", "AMD", "Apple", "NVIDIA"], correctAnswer: "Apple", category: "Technology", difficulty: "medium" },
    { text: "What is the programming language created by Brendan Eich in 10 days?", options: ["Python", "Ruby", "JavaScript", "PHP"], correctAnswer: "JavaScript", category: "Technology", difficulty: "medium" },
    // ── Hard ──────────────────────────────────────────────────────────────
    { text: "What was the world's first commercially successful smartphone?", options: ["iPhone", "BlackBerry 850", "Nokia 9000", "IBM Simon"], correctAnswer: "IBM Simon", category: "Technology", difficulty: "hard" },
    { text: "In what year was the World Wide Web invented by Tim Berners-Lee?", options: ["1985", "1989", "1991", "1993"], correctAnswer: "1989", category: "Technology", difficulty: "hard" },
    { text: "How many transistors are in Apple's M2 chip?", options: ["8 billion", "15 billion", "20 billion", "30 billion"], correctAnswer: "20 billion", category: "Technology", difficulty: "hard" },
    { text: "What is the name of the first computer bug?", options: ["A real moth", "A syntax error", "A memory leak", "A hardware glitch"], correctAnswer: "A real moth", category: "Technology", difficulty: "hard" },
    { text: "What year was the first commercial mobile phone released?", options: ["1973", "1983", "1990", "1993"], correctAnswer: "1983", category: "Technology", difficulty: "hard" },
    { text: "Who invented the World Wide Web?", options: ["Bill Gates", "Steve Jobs", "Tim Berners-Lee", "Vint Cerf"], correctAnswer: "Tim Berners-Lee", category: "Technology", difficulty: "hard" },
    { text: "What does 'SQL' stand for?", options: ["Standard Query Language", "Structured Query Language", "Simple Query Language", "Sequential Query Language"], correctAnswer: "Structured Query Language", category: "Technology", difficulty: "hard" },
    { text: "In computing, what does 'BIOS' stand for?", options: ["Basic Input/Output System", "Binary Input Operations System", "Base Integrated Operating Software", "Binary Integrated Operating System"], correctAnswer: "Basic Input/Output System", category: "Technology", difficulty: "hard" },
    { text: "What was the name of the first computer virus?", options: ["ILOVEYOU", "Creeper", "Morris Worm", "Elk Cloner"], correctAnswer: "Creeper", category: "Technology", difficulty: "hard" },
  ],
  games: [
    // ── Easy ──────────────────────────────────────────────────────────────
    { text: "What is the best-selling video game of all time?", options: ["Tetris", "Minecraft", "GTA V", "Wii Sports"], correctAnswer: "Minecraft", category: "Games", difficulty: "easy" },
    { text: "What is the name of the main character in The Legend of Zelda?", options: ["Zelda", "Link", "Ganon", "Mario"], correctAnswer: "Link", category: "Games", difficulty: "easy" },
    { text: "What is the currency called in Fortnite?", options: ["Gold", "Credits", "V-Bucks", "Coins"], correctAnswer: "V-Bucks", category: "Games", difficulty: "easy" },
    { text: "What gaming console is known for its motion controls?", options: ["PlayStation 4", "Xbox One", "Nintendo Wii", "Sega Genesis"], correctAnswer: "Nintendo Wii", category: "Games", difficulty: "easy" },
    { text: "Which game features a post-apocalyptic world with 'vaults'?", options: ["The Last of Us", "Metro", "Fallout", "Dying Light"], correctAnswer: "Fallout", category: "Games", difficulty: "easy" },
    { text: "Which game popularized the 'battle royale' genre on PC?", options: ["Fortnite", "PUBG", "Apex Legends", "H1Z1"], correctAnswer: "PUBG", category: "Games", difficulty: "easy" },
    { text: "What is the name of the in-game currency in Roblox?", options: ["Credits", "Robux", "Coins", "Bucks"], correctAnswer: "Robux", category: "Games", difficulty: "easy" },
    { text: "Which Pokémon is number 001 in the National Pokédex?", options: ["Pikachu", "Charmander", "Bulbasaur", "Mew"], correctAnswer: "Bulbasaur", category: "Games", difficulty: "easy" },
    { text: "What is the main objective in Among Us?", options: ["Build structures", "Complete tasks or eliminate crew", "Collect coins", "Race to finish"], correctAnswer: "Complete tasks or eliminate crew", category: "Games", difficulty: "easy" },
    { text: "What is the name of the default skin in Minecraft?", options: ["Alex", "Steve", "Creeper", "Enderman"], correctAnswer: "Steve", category: "Games", difficulty: "easy" },
    // ── Medium ────────────────────────────────────────────────────────────
    { text: "In which year was the first Super Mario Bros. game released?", options: ["1983", "1985", "1987", "1989"], correctAnswer: "1985", category: "Games", difficulty: "medium" },
    { text: "Which game features the character 'Master Chief'?", options: ["Call of Duty", "Halo", "Destiny", "Gears of War"], correctAnswer: "Halo", category: "Games", difficulty: "medium" },
    { text: "Which company created the game 'The Witcher 3'?", options: ["Bethesda", "Ubisoft", "CD Projekt Red", "BioWare"], correctAnswer: "CD Projekt Red", category: "Games", difficulty: "medium" },
    { text: "Which game series features the character Kratos?", options: ["God of War", "Devil May Cry", "Dark Souls", "Assassin's Creed"], correctAnswer: "God of War", category: "Games", difficulty: "medium" },
    { text: "What is the name of the battle royale mode in Call of Duty?", options: ["Battle Royale", "Warzone", "Blackout", "Survival"], correctAnswer: "Warzone", category: "Games", difficulty: "medium" },
    { text: "Which game won Game of the Year at The Game Awards 2022?", options: ["God of War Ragnarök", "Elden Ring", "Horizon Forbidden West", "Stray"], correctAnswer: "Elden Ring", category: "Games", difficulty: "medium" },
    { text: "What is the name of the main antagonist in Portal?", options: ["Wheatley", "GLaDOS", "Cave Johnson", "Chell"], correctAnswer: "GLaDOS", category: "Games", difficulty: "medium" },
    { text: "What is the maximum level in Pokémon games?", options: ["99", "100", "150", "255"], correctAnswer: "100", category: "Games", difficulty: "medium" },
    { text: "Which game series is known for the phrase 'Would you kindly'?", options: ["Half-Life", "BioShock", "Dishonored", "Portal"], correctAnswer: "BioShock", category: "Games", difficulty: "medium" },
    { text: "What is the best-selling racing game franchise ever?", options: ["Mario Kart", "Need for Speed", "Gran Turismo", "Burnout"], correctAnswer: "Gran Turismo", category: "Games", difficulty: "medium" },
    { text: "What game uses the phrase 'The Cake is a Lie'?", options: ["Half-Life 2", "Portal", "BioShock", "Halo"], correctAnswer: "Portal", category: "Games", difficulty: "medium" },
    { text: "What was the best-selling game of 2023?", options: ["Hogwarts Legacy", "The Legend of Zelda: Tears of the Kingdom", "Mortal Kombat 1", "Spider-Man 2"], correctAnswer: "The Legend of Zelda: Tears of the Kingdom", category: "Games", difficulty: "medium" },
    { text: "Which game developer created 'Dark Souls'?", options: ["Capcom", "FromSoftware", "Bandai Namco", "Square Enix"], correctAnswer: "FromSoftware", category: "Games", difficulty: "medium" },
    { text: "What popular card game involves matching pairs and avoiding the Old Maid?", options: ["Crazy Eights", "Go Fish", "War", "Old Maid"], correctAnswer: "Old Maid", category: "Games", difficulty: "medium" },
    // ── Hard ──────────────────────────────────────────────────────────────
    { text: "In chess, what is the term for when a king is in check with no legal moves?", options: ["Stalemate", "Checkmate", "Forfeit", "Draw"], correctAnswer: "Checkmate", category: "Games", difficulty: "hard" },
    { text: "What is the best possible score in a game of darts (three darts)?", options: ["150", "170", "180", "200"], correctAnswer: "180", category: "Games", difficulty: "hard" },
    { text: "What famous game designer created Shigeru Miyamoto's Mario and Zelda?", options: ["Shigeru Miyamoto", "Hideo Kojima", "Satoshi Tajiri", "Gunpei Yokoi"], correctAnswer: "Shigeru Miyamoto", category: "Games", difficulty: "hard" },
    { text: "What year was World of Warcraft first released?", options: ["2001", "2002", "2004", "2006"], correctAnswer: "2004", category: "Games", difficulty: "hard" },
    { text: "How many squares are on a standard checkers board?", options: ["32", "48", "64", "100"], correctAnswer: "64", category: "Games", difficulty: "hard" },
    { text: "Which competitive game is associated with 'The International' tournament?", options: ["League of Legends", "Dota 2", "CS:GO", "Valorant"], correctAnswer: "Dota 2", category: "Games", difficulty: "hard" },
    { text: "What was the first commercial arcade video game?", options: ["Pong", "Space Invaders", "Computer Space", "Pac-Man"], correctAnswer: "Computer Space", category: "Games", difficulty: "hard" },
    { text: "The board game Catan was originally released in which country?", options: ["USA", "Germany", "UK", "Japan"], correctAnswer: "Germany", category: "Games", difficulty: "hard" },
    { text: "In poker, what hand beats a Full House?", options: ["Three of a Kind", "Two Pair", "Four of a Kind", "Straight"], correctAnswer: "Four of a Kind", category: "Games", difficulty: "hard" },
    { text: "What is the highest tile you can create in the original 2048 game?", options: ["2048", "4096", "8192", "The game never ends"], correctAnswer: "The game never ends", category: "Games", difficulty: "hard" },
  ],
  'las-vegas': [
    // ── Easy ──────────────────────────────────────────────────────────────
    { text: "What is the nickname for the Las Vegas Strip?", options: ["The Boulevard", "The Neon Mile", "The Golden Road", "The Strip"], correctAnswer: "The Strip", category: "🎰 Las Vegas", difficulty: "easy" },
    { text: "Which famous Las Vegas hotel has a replica of the Eiffel Tower?", options: ["Bellagio", "Paris Las Vegas", "Caesars Palace", "Wynn"], correctAnswer: "Paris Las Vegas", category: "🎰 Las Vegas", difficulty: "easy" },
    { text: "What shape is the Luxor hotel in Las Vegas?", options: ["Pyramid", "Cylinder", "Dome", "Tower"], correctAnswer: "Pyramid", category: "🎰 Las Vegas", difficulty: "easy" },
    { text: "How many miles long is the Las Vegas Strip (roughly)?", options: ["2 miles", "4 miles", "6 miles", "8 miles"], correctAnswer: "4 miles", category: "🎰 Las Vegas", difficulty: "easy" },
    { text: "What landmark is located about 30 miles from Las Vegas?", options: ["Grand Canyon", "Hoover Dam", "Zion National Park", "Death Valley"], correctAnswer: "Hoover Dam", category: "🎰 Las Vegas", difficulty: "easy" },
    { text: "What is the most popular card game in a casino?", options: ["Poker", "Blackjack", "Baccarat", "War"], correctAnswer: "Blackjack", category: "🎰 Las Vegas", difficulty: "easy" },
    { text: "What does '21' refer to in casino Blackjack?", options: ["Minimum bet", "The perfect hand total", "Number of decks", "The dealer's limit"], correctAnswer: "The perfect hand total", category: "🎰 Las Vegas", difficulty: "easy" },
    { text: "What iconic phrase is associated with Las Vegas gambling?", options: ["All In", "House Always Wins", "What Happens in Vegas", "High Roller"], correctAnswer: "House Always Wins", category: "🎰 Las Vegas", difficulty: "easy" },
    { text: "What is the name of the massive indoor entertainment sphere that opened in Las Vegas in 2023?", options: ["The Globe", "Sphere", "The Orb", "Vegas Dome"], correctAnswer: "Sphere", category: "🎰 Las Vegas", difficulty: "easy" },
    { text: "What US state is Las Vegas located in?", options: ["Arizona", "California", "Nevada", "Utah"], correctAnswer: "Nevada", category: "🎰 Las Vegas", difficulty: "easy" },
    // ── Medium ────────────────────────────────────────────────────────────
    { text: "Which Las Vegas casino resort is known for its volcano attraction?", options: ["MGM Grand", "Treasure Island", "The Mirage", "Luxor"], correctAnswer: "The Mirage", category: "🎰 Las Vegas", difficulty: "medium" },
    { text: "What year was Las Vegas officially incorporated as a city?", options: ["1900", "1905", "1910", "1915"], correctAnswer: "1905", category: "🎰 Las Vegas", difficulty: "medium" },
    { text: "What is the name of the famous welcome sign on Las Vegas Blvd?", options: ["Welcome to Fabulous Las Vegas Nevada", "Viva Las Vegas", "What Happens Here Stays Here", "City of Lights"], correctAnswer: "Welcome to Fabulous Las Vegas Nevada", category: "🎰 Las Vegas", difficulty: "medium" },
    { text: "Which famous rock band is based in Las Vegas?", options: ["Imagine Dragons", "The Killers", "3 Doors Down", "Both A and B"], correctAnswer: "Both A and B", category: "🎰 Las Vegas", difficulty: "medium" },
    { text: "What is the name of the indoor roller coaster inside the New York-New York casino?", options: ["Big Apple Coaster", "NYC Express", "The Manhattan", "Empire Ride"], correctAnswer: "Big Apple Coaster", category: "🎰 Las Vegas", difficulty: "medium" },
    { text: "Las Vegas is located in which Nevada county?", options: ["Washoe County", "Clark County", "Nye County", "Douglas County"], correctAnswer: "Clark County", category: "🎰 Las Vegas", difficulty: "medium" },
    { text: "What is the average temperature in Las Vegas during July (°F)?", options: ["85°F", "95°F", "105°F", "115°F"], correctAnswer: "105°F", category: "🎰 Las Vegas", difficulty: "medium" },
    { text: "What area just west of Las Vegas is known for red rock formations?", options: ["Valley of Fire", "Red Rock Canyon", "Boulder City", "Henderson"], correctAnswer: "Red Rock Canyon", category: "🎰 Las Vegas", difficulty: "medium" },
    { text: "What is the approximate population of Las Vegas metro area?", options: ["500,000", "1 million", "2 million", "3 million"], correctAnswer: "2 million", category: "🎰 Las Vegas", difficulty: "medium" },
    { text: "Which legendary entertainer was known as 'Mr. Las Vegas'?", options: ["Frank Sinatra", "Dean Martin", "Wayne Newton", "Sammy Davis Jr."], correctAnswer: "Wayne Newton", category: "🎰 Las Vegas", difficulty: "medium" },
    { text: "How many visitors does Las Vegas attract annually (approximately)?", options: ["20 million", "30 million", "40 million", "50 million"], correctAnswer: "40 million", category: "🎰 Las Vegas", difficulty: "medium" },
    { text: "What famous Las Vegas magic duo performed at the Mirage for years?", options: ["Penn & Teller", "Siegfried & Roy", "David & Goliath", "Copperfield & White"], correctAnswer: "Siegfried & Roy", category: "🎰 Las Vegas", difficulty: "medium" },
    { text: "Which mini golf and entertainment venue is known as Putters on the Strip?", options: ["Adventure Golf", "Putters Vegas", "Mini Golf Palace", "The Putter Club"], correctAnswer: "Putters Vegas", category: "🎰 Las Vegas", difficulty: "medium" },
    { text: "What is the neighborhood in Las Vegas known for its arts district?", options: ["Downtown Container Park area", "The Arts District", "18b Arts District", "Fremont East"], correctAnswer: "18b Arts District", category: "🎰 Las Vegas", difficulty: "medium" },
    { text: "What casino game involves spinning a wheel with numbered pockets?", options: ["Craps", "Baccarat", "Roulette", "Keno"], correctAnswer: "Roulette", category: "🎰 Las Vegas", difficulty: "medium" },
    // ── Hard ──────────────────────────────────────────────────────────────
    { text: "Fremont Street is famous for its massive LED canopy. How long is it?", options: ["1,500 feet", "3,000 feet", "4,500 feet", "1 mile"], correctAnswer: "1,500 feet", category: "🎰 Las Vegas", difficulty: "hard" },
    { text: "Which Las Vegas hotel was once the tallest building west of the Mississippi?", options: ["MGM Grand", "Stratosphere Tower", "Wynn", "Caesars Palace"], correctAnswer: "Stratosphere Tower", category: "🎰 Las Vegas", difficulty: "hard" },
    { text: "The High Roller observation wheel opened in Las Vegas in what year?", options: ["2010", "2012", "2014", "2016"], correctAnswer: "2014", category: "🎰 Las Vegas", difficulty: "hard" },
    { text: "The Bellagio fountains use water from which source?", options: ["Lake Mead", "Lake Las Vegas", "An artificial reservoir", "Underground wells"], correctAnswer: "An artificial reservoir", category: "🎰 Las Vegas", difficulty: "hard" },
    { text: "Which famous comedian has performed a long-running residency at Caesar's Palace?", options: ["Jerry Seinfeld", "Dave Chappelle", "Kevin Hart", "Gabriel Iglesias"], correctAnswer: "Jerry Seinfeld", category: "🎰 Las Vegas", difficulty: "hard" },
    { text: "In craps, what is the name for a roll of 2 (two ones)?", options: ["Snake Eyes", "Boxcars", "Hard Eight", "Yo-Eleven"], correctAnswer: "Snake Eyes", category: "🎰 Las Vegas", difficulty: "hard" },
    { text: "What is the house edge on a standard American roulette wheel?", options: ["2.70%", "5.26%", "8.00%", "10.52%"], correctAnswer: "5.26%", category: "🎰 Las Vegas", difficulty: "hard" },
    { text: "What year did legalized gambling begin in Nevada?", options: ["1919", "1931", "1941", "1955"], correctAnswer: "1931", category: "🎰 Las Vegas", difficulty: "hard" },
    { text: "The famous Rat Pack performed at which Las Vegas venue?", options: ["The Flamingo", "The Sands Hotel", "Caesars Palace", "The Stardust"], correctAnswer: "The Sands Hotel", category: "🎰 Las Vegas", difficulty: "hard" },
    { text: "In poker, what hand consists of five consecutive cards of the same suit?", options: ["Royal Flush", "Straight Flush", "Full House", "Four of a Kind"], correctAnswer: "Straight Flush", category: "🎰 Las Vegas", difficulty: "hard" },
  ],
};

// Pictionary word lists
const PICTIONARY_WORDS = {
  easy: [
    'cat', 'dog', 'house', 'tree', 'sun', 'moon', 'car', 'boat', 'fish', 'bird',
    'apple', 'pizza', 'cake', 'hat', 'shoe', 'star', 'heart', 'cloud', 'rain', 'snow',
    'beach', 'mountain', 'flower', 'plane', 'train', 'bus', 'ball', 'book', 'chair', 'table'
  ],
  medium: [
    'skateboard', 'volcano', 'rainbow', 'lighthouse', 'castle', 'dragon', 'pirate', 'mermaid',
    'submarine', 'helicopter', 'tornado', 'cactus', 'penguin', 'elephant', 'robot', 'wizard',
    'campfire', 'snowman', 'birthday', 'treasure', 'spider', 'monkey', 'giraffe', 'crocodile'
  ],
  hard: [
    'Las Vegas', 'blackjack', 'jackpot', 'poker night', 'mini golf', 'neon sign', 'slot machine',
    'poker chip', 'roulette', 'dice roll', 'high roller', 'free drinks', 'late night', 'all-in',
    'house always wins', 'shuffle', 'dealer', 'casino floor', 'showgirl', 'comedian'
  ],
  'vegas-themed': [
    'jackpot', 'slot machine', 'poker', 'roulette', 'dice', 'neon sign', 'showgirl', 'magician',
    'Eiffel Tower replica', 'pyramid hotel', 'dancing fountain', 'roller coaster', 'mini golf',
    'buffet', 'penthouse', 'limo', 'wedding chapel', 'desert', 'palm tree', 'cocktail'
  ]
};

// Apples to Apples green cards (adjectives/topics) and red cards (nouns/things)
const APPLES_CARDS = {
  green: [
    'Hilarious', 'Terrifying', 'Delicious', 'Awkward', 'Legendary', 'Wild', 'Sneaky', 'Fabulous',
    'Exhausting', 'Overrated', 'Underrated', 'Romantic', 'Ridiculous', 'Mysterious', 'Unstoppable',
    'Cringeworthy', 'Iconic', 'Chaotic', 'Unbelievable', 'Relatable', 'Epic', 'Sketchy', 'Wholesome',
    'Spicy', 'Basic', 'Extra', 'Toxic', 'Blessed', 'Cursed', 'Savage'
  ],
  red: [
    'Your ex', 'Monday mornings', 'Free Wi-Fi', 'Las Vegas at 3am', 'The buffet line',
    'A slot machine jackpot', 'Your boss on vacation', 'A poker face', 'Bar trivia night',
    'The hotel mini bar', 'Room service at midnight', 'A round of shots', 'The designated driver',
    'Party in Vegas', 'The Strip at night', 'Winning at blackjack', 'Your high score',
    'The walk of shame', 'An open bar', 'A magic show', 'The all-you-can-eat buffet',
    'A casino floor', 'Losing your room key', 'Finding $20', 'A surprise upgrade',
    'Late night tacos', 'The best man speech', 'A wedding chapel', 'Pool party', 'Karaoke',
    'Your teammates', 'The last question', 'A perfect score', 'Going home early', 'One more round'
  ]
};

// Scoring constants
const PICTIONARY_MAX_GUESS_POINTS = 50;
const PICTIONARY_MIN_GUESS_POINTS = 10;
const PICTIONARY_POINT_DECAY_PER_GUESS = 10;
const PICTIONARY_DRAWER_POINTS_PER_GUESSER = 25;
const APPLES_ROUND_WIN_POINTS = 100;

// Game state management
class Game {
  constructor(hostId, hostName, gameMode = 'classic', genre = 'mixed') {
    this.id = uuidv4();
    this.pin = generateGamePin();
    this.hostId = hostId;
    this.hostName = hostName;
    this.gameMode = gameMode; // classic, buzzer, speed-round, lightning, pictionary, apples-to-apples
    this.genre = genre; // sports, movies, music, science, history, geography, pop-culture, food-drink, technology, games, las-vegas, mixed
    this.teams = new Map();
    this.questions = [];
    this.currentQuestionIndex = -1;
    this.state = 'lobby'; // lobby, question, answer-reveal, ended, buzzer-active, drawing, guessing, judging
    this.timer = null;
    this.questionStartTime = null;
    this.buzzerQueue = []; // For buzzer mode
    this.buzzedTeam = null; // Team that buzzed first
    this.usedQuestionIds = new Set(); // Track used questions to prevent repeats
    // Pictionary state
    this.pictionaryWords = [];
    this.currentWord = null;
    this.currentDrawerIndex = 0;
    this.currentDrawerId = null;
    this.pictionaryRound = 0;
    this.correctGuessers = new Set();
    // Apples to Apples state
    this.applesGreenCard = null;
    this.applesRound = 0;
    this.applesJudgeIndex = 0;
    this.applesJudgeId = null;
    this.applesSubmissions = new Map(); // teamId -> card text
    this.applesHands = new Map(); // teamId -> [card, card, ...]
    this.applesUsedGreen = new Set();
    this.applesUsedRed = new Set();
  }

  addTeam(teamId, teamName, socketId) {
    this.teams.set(teamId, {
      id: teamId,
      name: teamName,
      socketId: socketId,
      score: 0,
      answers: []
    });
  }

  removeTeam(teamId) {
    this.teams.delete(teamId);
  }

  addQuestion(question) {
    const questionId = uuidv4();
    this.questions.push({
      id: questionId,
      text: question.text,
      options: question.options,
      correctAnswer: question.correctAnswer,
      timeLimit: question.timeLimit || 30,
      category: question.category || 'General'
    });
    this.usedQuestionIds.add(questionId); // Track this question as used
  }

  // Load questions from pre-loaded bank with difficulty-balanced mixing
  loadQuestionsFromBank(count = 10) {
    let questionPool = [];
    
    if (this.genre === 'mixed') {
      // Pull evenly from all genres for maximum variety
      const banks = Object.values(QUESTION_BANKS);
      const perBank = Math.ceil(count * 2 / banks.length); // Oversample then trim
      banks.forEach(bank => {
        const shuffledBank = shuffleArray([...bank]);
        questionPool = questionPool.concat(shuffledBank.slice(0, perBank));
      });
    } else if (QUESTION_BANKS[this.genre]) {
      questionPool = [...QUESTION_BANKS[this.genre]];
    }

    // Filter out already used questions to prevent repeats across loads
    const usedTexts = new Set(this.questions.map(q => q.text));
    const availableQuestions = questionPool.filter(q => !usedTexts.has(q.text));
    
    // If all available questions have been used, reset and use full pool (fresh cycle)
    const questionsToUse = availableQuestions.length >= count ? availableQuestions : questionPool;

    // Difficulty-balanced selection: aim for roughly 30% easy, 50% medium, 20% hard
    const easy   = shuffleArray(questionsToUse.filter(q => q.difficulty === 'easy'));
    const medium = shuffleArray(questionsToUse.filter(q => q.difficulty === 'medium'));
    const hard   = shuffleArray(questionsToUse.filter(q => q.difficulty === 'hard'));
    const untagged = shuffleArray(questionsToUse.filter(q => !q.difficulty));

    const wantEasy   = Math.round(count * 0.30);
    const wantHard   = Math.round(count * 0.20);
    const wantMedium = count - wantEasy - wantHard;

    let selected = [
      ...easy.slice(0, wantEasy),
      ...medium.slice(0, wantMedium),
      ...hard.slice(0, wantHard),
      ...untagged,
    ];

    // Top up if we didn't have enough of a difficulty
    if (selected.length < count) {
      const used = new Set(selected.map(q => q.text));
      const remaining = shuffleArray(questionsToUse.filter(q => !used.has(q.text)));
      selected = selected.concat(remaining.slice(0, count - selected.length));
    }

    // Final shuffle so difficulty order is random and trim to count
    selected = shuffleArray(selected).slice(0, count);
    
    // Time limits based on game mode
    let timeLimit = 30;
    if (this.gameMode === 'speed-round') {
      timeLimit = 15;
    } else if (this.gameMode === 'lightning') {
      timeLimit = 10;
    }
    
    selected.forEach(q => {
      this.addQuestion({
        ...q,
        timeLimit: timeLimit
      });
    });

    return this.questions.length;
  }

  // Load questions from Open Trivia DB API
  async loadQuestionsFromAPI(count = 10) {
    try {
      const questions = await fetchOpenTriviaQuestions(count);
      
      // Set time limits based on game mode
      let timeLimit = 30; // Default for classic
      if (this.gameMode === 'speed-round') {
        timeLimit = 15;
      } else if (this.gameMode === 'lightning') {
        timeLimit = 10;
      }
      
      questions.forEach(q => {
        this.addQuestion({
          ...q,
          timeLimit: timeLimit
        });
      });
      
      return this.questions.length;
    } catch (error) {
      console.error('Error loading questions from API:', error);
      return 0;
    }
  }

  // Buzzer mode methods
  handleBuzz(teamId) {
    if (this.state !== 'buzzer-active') return false;
    
    if (!this.buzzedTeam) {
      this.buzzedTeam = teamId;
      this.buzzerQueue.push({ teamId, time: Date.now() });
      return true;
    }
    return false;
  }

  clearBuzzer() {
    this.buzzedTeam = null;
    this.buzzerQueue = [];
  }

  getCurrentQuestion() {
    if (this.currentQuestionIndex >= 0 && this.currentQuestionIndex < this.questions.length) {
      const question = this.questions[this.currentQuestionIndex];
      // Return question without correct answer to players
      return {
        id: question.id,
        text: question.text,
        options: question.options,
        timeLimit: question.timeLimit,
        category: question.category,
        questionNumber: this.currentQuestionIndex + 1,
        totalQuestions: this.questions.length,
        gameMode: this.gameMode
      };
    }
    return null;
  }

  submitAnswer(teamId, answer) {
    const team = this.teams.get(teamId);
    if (!team) return false;

    const question = this.questions[this.currentQuestionIndex];
    if (!question) return false;

    const answerTime = Date.now() - this.questionStartTime;
    const isCorrect = answer === question.correctAnswer;
    
    // Score calculation: correct answer + time bonus
    let points = 0;
    if (isCorrect) {
      points = 100;
      // Time bonus: up to 50 extra points for quick answers
      const timeBonus = Math.max(0, Math.floor(50 * (1 - answerTime / (question.timeLimit * 1000))));
      points += timeBonus;
    }

    team.answers.push({
      questionId: question.id,
      answer: answer,
      isCorrect: isCorrect,
      points: points,
      time: answerTime
    });

    team.score += points;
    return { isCorrect, points };
  }

  getLeaderboard() {
    return Array.from(this.teams.values())
      .map(team => ({
        name: team.name,
        score: team.score,
        answersCount: team.answers.length
      }))
      .sort((a, b) => b.score - a.score);
  }

  nextQuestion() {
    this.currentQuestionIndex++;
    this.state = 'question';
    this.questionStartTime = Date.now();
    return this.currentQuestionIndex < this.questions.length;
  }

  revealAnswer() {
    this.state = 'answer-reveal';
    const question = this.questions[this.currentQuestionIndex];
    return {
      correctAnswer: question.correctAnswer,
      leaderboard: this.getLeaderboard()
    };
  }

  endGame() {
    this.state = 'ended';
    return {
      finalLeaderboard: this.getLeaderboard(),
      totalQuestions: this.questions.length
    };
  }

  // Pictionary methods
  initPictionary(difficulty = 'medium') {
    const wordPool = [
      ...(PICTIONARY_WORDS.easy || []),
      ...(PICTIONARY_WORDS[difficulty] || PICTIONARY_WORDS.medium),
      ...(PICTIONARY_WORDS['vegas-themed'] || [])
    ];
    this.pictionaryWords = shuffleArray(wordPool);
    this.currentDrawerIndex = 0;
    this.pictionaryRound = 0;
    const teamIds = Array.from(this.teams.keys());
    this.currentDrawerId = teamIds[0] || null;
    return teamIds.length > 0;
  }

  nextPictionaryTurn() {
    const teamIds = Array.from(this.teams.keys());
    if (teamIds.length === 0) return null;
    this.correctGuessers = new Set();
    this.currentDrawerIndex = (this.currentDrawerIndex + 1) % teamIds.length;
    if (this.currentDrawerIndex === 0) this.pictionaryRound++;
    this.currentDrawerId = teamIds[this.currentDrawerIndex];
    this.currentWord = this.pictionaryWords[Math.floor(Math.random() * this.pictionaryWords.length)];
    this.state = 'drawing';
    return {
      drawerId: this.currentDrawerId,
      drawerName: this.teams.get(this.currentDrawerId)?.name,
      round: this.pictionaryRound
    };
  }

  startPictionaryTurn() {
    const teamIds = Array.from(this.teams.keys());
    if (teamIds.length === 0) return null;
    this.correctGuessers = new Set();
    this.currentDrawerId = teamIds[this.currentDrawerIndex % teamIds.length];
    this.currentWord = this.pictionaryWords[Math.floor(Math.random() * this.pictionaryWords.length)];
    this.state = 'drawing';
    return {
      drawerId: this.currentDrawerId,
      drawerName: this.teams.get(this.currentDrawerId)?.name,
      round: this.pictionaryRound
    };
  }

  submitPictionaryGuess(teamId, guess) {
    if (this.state !== 'drawing') return { valid: false };
    if (teamId === this.currentDrawerId) return { valid: false, message: "You're drawing!" };
    if (this.correctGuessers.has(teamId)) return { valid: false, message: 'Already guessed correctly' };

    const isCorrect = guess.trim().toLowerCase() === this.currentWord.toLowerCase();
    if (isCorrect) {
      this.correctGuessers.add(teamId);
      const team = this.teams.get(teamId);
      const drawer = this.teams.get(this.currentDrawerId);
      // Points based on guess order
      const points = Math.max(PICTIONARY_MIN_GUESS_POINTS, PICTIONARY_MAX_GUESS_POINTS - (this.correctGuessers.size - 1) * PICTIONARY_POINT_DECAY_PER_GUESS);
      if (team) team.score += points;
      // Drawer gets points per correct guesser
      if (drawer) drawer.score += PICTIONARY_DRAWER_POINTS_PER_GUESSER;
      return { valid: true, isCorrect: true, points, guesserName: team?.name };
    }
    return { valid: true, isCorrect: false };
  }

  // Apples to Apples methods
  initApplesToApples() {
    // Deal 5 red cards to each team
    const shuffledRed = shuffleArray([...APPLES_CARDS.red]);
    let cardIndex = 0;
    this.teams.forEach((team, teamId) => {
      const hand = [];
      for (let i = 0; i < 5; i++) {
        if (cardIndex < shuffledRed.length) {
          hand.push(shuffledRed[cardIndex++]);
          this.applesUsedRed.add(shuffledRed[cardIndex - 1]);
        }
      }
      this.applesHands.set(teamId, hand);
    });
    this.applesRound = 0;
    const teamIds = Array.from(this.teams.keys());
    this.applesJudgeId = teamIds[0];
    this.state = 'judging';
    return true;
  }

  startApplesRound() {
    // Pick new green card
    const availableGreen = APPLES_CARDS.green.filter(c => !this.applesUsedGreen.has(c));
    const greenPool = availableGreen.length > 0 ? availableGreen : APPLES_CARDS.green;
    this.applesGreenCard = greenPool[Math.floor(Math.random() * greenPool.length)];
    this.applesUsedGreen.add(this.applesGreenCard);
    this.applesSubmissions = new Map();
    // Pick judge (rotate)
    const teamIds = Array.from(this.teams.keys());
    this.applesJudgeIndex = this.applesRound % teamIds.length;
    this.applesJudgeId = teamIds[this.applesJudgeIndex];
    this.applesRound++;
    this.state = 'playing-cards';
    return {
      greenCard: this.applesGreenCard,
      judgeId: this.applesJudgeId,
      judgeName: this.teams.get(this.applesJudgeId)?.name,
      round: this.applesRound
    };
  }

  submitApplesCard(teamId, card) {
    if (teamId === this.applesJudgeId) return { valid: false, message: "You're the judge!" };
    if (this.applesSubmissions.has(teamId)) return { valid: false, message: 'Already submitted' };
    const hand = this.applesHands.get(teamId) || [];
    if (!hand.includes(card)) return { valid: false, message: 'Card not in hand' };
    this.applesSubmissions.set(teamId, card);
    // Remove played card from hand and deal a new one
    const newHand = hand.filter(c => c !== card);
    // Use the persistent applesUsedRed set (maintained across the game) to avoid duplicates
    const availableRed = APPLES_CARDS.red.filter(c => !this.applesUsedRed.has(c));
    const pool = availableRed.length > 0 ? availableRed : APPLES_CARDS.red;
    const newCard = pool[Math.floor(Math.random() * pool.length)];
    newHand.push(newCard);
    this.applesUsedRed.add(newCard);
    this.applesHands.set(teamId, newHand);
    return { valid: true, submitted: true, submittedCount: this.applesSubmissions.size };
  }

  judgeApples(winningTeamId) {
    const team = this.teams.get(winningTeamId);
    if (team) team.score += APPLES_ROUND_WIN_POINTS;
    const winningCard = this.applesSubmissions.get(winningTeamId);
    this.state = 'judging';
    return {
      winningTeamId,
      winningTeamName: team?.name,
      winningCard,
      greenCard: this.applesGreenCard,
      leaderboard: this.getLeaderboard()
    };
  }
}

// REST API endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', games: games.size });
});

app.post('/api/games/create', (req, res) => {
  const { hostName } = req.body;
  const hostId = uuidv4();
  const game = new Game(hostId, hostName);
  games.set(game.pin, game);
  
  console.log(`Game created: PIN ${game.pin} by ${hostName}`);
  
  res.json({
    gameId: game.id,
    pin: game.pin,
    hostId: hostId
  });
});

app.get('/api/games/:pin', (req, res) => {
  const { pin } = req.params;
  const game = games.get(pin);
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  res.json({
    pin: game.pin,
    state: game.state,
    teams: game.teams.size,
    questions: game.questions.length
  });
});

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Host creates game
  socket.on('host:create-game', (data, callback) => {
    const { hostName, gameMode = 'classic', genre = 'mixed' } = data;
    const hostId = uuidv4();
    const game = new Game(hostId, hostName, gameMode, genre);
    games.set(game.pin, game);
    
    socket.join(`game-${game.pin}`);
    socket.join(`host-${game.pin}`);
    
    console.log(`Game created: PIN ${game.pin} by ${hostName}, Mode: ${gameMode}, Genre: ${genre}`);
    
    callback({
      success: true,
      gameId: game.id,
      pin: game.pin,
      hostId: hostId,
      gameMode: gameMode,
      genre: genre
    });
  });

  // Host loads questions from bank
  socket.on('host:load-questions', (data, callback) => {
    const { pin, count = 10 } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    const questionsLoaded = game.loadQuestionsFromBank(count);
    
    console.log(`${questionsLoaded} questions loaded for game ${pin}`);
    
    // Calculate remaining pool for informational purposes
    let totalPool = 0;
    if (game.genre === 'mixed') {
      Object.values(QUESTION_BANKS).forEach(bank => { totalPool += bank.length; });
    } else if (QUESTION_BANKS[game.genre]) {
      totalPool = QUESTION_BANKS[game.genre].length;
    }

    callback({
      success: true,
      questionsCount: questionsLoaded,
      poolSize: totalPool,
    });
  });

  // Host loads questions from Open Trivia DB API
  socket.on('host:load-api-questions', async (data, callback) => {
    const { pin, count = 10 } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    try {
      const questionsLoaded = await game.loadQuestionsFromAPI(count);
      
      if (questionsLoaded > 0) {
        console.log(`${questionsLoaded} API questions loaded for game ${pin}`);
        callback({
          success: true,
          questionsCount: questionsLoaded
        });
      } else {
        callback({
          success: false,
          error: 'Failed to load questions from API'
        });
      }
    } catch (error) {
      console.error('Error loading API questions:', error);
      callback({
        success: false,
        error: 'Failed to load questions from API'
      });
    }
  });

  // Team joins game
  socket.on('team:join', (data, callback) => {
    const { pin, teamName } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    if (game.state !== 'lobby') {
      return callback({ success: false, error: 'Game already started' });
    }
    
    const teamId = uuidv4();
    game.addTeam(teamId, teamName, socket.id);
    
    socket.join(`game-${pin}`);
    
    console.log(`Team "${teamName}" joined game ${pin}`);
    
    // Notify host about new team
    io.to(`host-${pin}`).emit('team:joined', {
      teamId: teamId,
      teamName: teamName,
      totalTeams: game.teams.size
    });
    
    callback({
      success: true,
      teamId: teamId,
      teamName: teamName,
      gameState: game.state,
      gameMode: game.gameMode,
      genre: game.genre
    });
  });

  // Host adds questions
  socket.on('host:add-question', (data, callback) => {
    const { pin, question } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    game.addQuestion(question);
    
    callback({
      success: true,
      totalQuestions: game.questions.length
    });
  });

  // Host starts game
  socket.on('host:start-game', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    if (game.questions.length === 0) {
      return callback({ success: false, error: 'No questions added' });
    }
    
    game.nextQuestion();
    const question = game.getCurrentQuestion();
    
    // Notify all players
    io.to(`game-${pin}`).emit('game:started', { question });
    
    console.log(`Game ${pin} started with ${game.questions.length} questions`);
    
    callback({ success: true });
  });

  // Host shows next question
  socket.on('host:next-question', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    const hasMore = game.nextQuestion();
    
    if (!hasMore) {
      const result = game.endGame();
      io.to(`game-${pin}`).emit('game:ended', result);
      return callback({ success: true, ended: true });
    }
    
    const question = game.getCurrentQuestion();
    io.to(`game-${pin}`).emit('question:new', { question });
    
    callback({ success: true, question });
  });

  // Team submits answer
  socket.on('team:submit-answer', (data, callback) => {
    const { pin, teamId, answer } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    if (game.state !== 'question') {
      return callback({ success: false, error: 'Not accepting answers' });
    }
    
    const result = game.submitAnswer(teamId, answer);
    
    if (!result) {
      return callback({ success: false, error: 'Invalid team or question' });
    }
    
    // Notify host
    io.to(`host-${pin}`).emit('answer:submitted', {
      teamId: teamId,
      answered: true
    });
    
    callback({
      success: true,
      submitted: true
    });
  });

  // Host reveals answer
  socket.on('host:reveal-answer', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    const result = game.revealAnswer();
    
    // Show results to everyone
    io.to(`game-${pin}`).emit('answer:revealed', result);
    
    callback({ success: true, ...result });
  });

  // Get current leaderboard
  socket.on('game:get-leaderboard', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    callback({
      success: true,
      leaderboard: game.getLeaderboard()
    });
  });

  // Buzzer mode: Team buzzes in
  socket.on('team:buzz', (data, callback) => {
    const { pin, teamId } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    if (game.gameMode !== 'buzzer') {
      return callback({ success: false, error: 'Not in buzzer mode' });
    }
    
    const buzzed = game.handleBuzz(teamId);
    
    if (buzzed) {
      const team = game.teams.get(teamId);
      // Notify everyone that this team buzzed first
      io.to(`game-${pin}`).emit('team:buzzed', {
        teamId: teamId,
        teamName: team.name
      });
      
      callback({ success: true, buzzedFirst: true });
    } else {
      callback({ success: false, buzzedFirst: false, message: 'Someone else buzzed first' });
    }
  });

  // Buzzer mode: Host activates buzzer
  socket.on('host:activate-buzzer', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    game.state = 'buzzer-active';
    game.clearBuzzer();
    
    io.to(`game-${pin}`).emit('buzzer:activated');
    
    callback({ success: true });
  });

  // Buzzer mode: Host clears buzzer
  socket.on('host:clear-buzzer', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    
    if (!game) {
      return callback({ success: false, error: 'Game not found' });
    }
    
    game.clearBuzzer();
    game.state = 'question';
    
    io.to(`game-${pin}`).emit('buzzer:cleared');
    
    callback({ success: true });
  });

  // ==================== PICTIONARY EVENTS ====================

  // Host starts Pictionary game
  socket.on('host:start-pictionary', (data, callback) => {
    const { pin, difficulty = 'medium' } = data;
    const game = games.get(pin);
    if (!game) return callback({ success: false, error: 'Game not found' });

    const ok = game.initPictionary(difficulty);
    if (!ok) return callback({ success: false, error: 'Need at least one player' });

    const turnInfo = game.startPictionaryTurn();
    if (!turnInfo) return callback({ success: false, error: 'Could not start turn' });

    // Send word only to drawer
    const drawerSocket = game.teams.get(turnInfo.drawerId)?.socketId;
    if (drawerSocket) {
      io.to(drawerSocket).emit('pictionary:your-turn', { word: game.currentWord });
    }

    // Notify everyone else
    io.to(`game-${pin}`).emit('pictionary:round-start', {
      drawerId: turnInfo.drawerId,
      drawerName: turnInfo.drawerName,
      round: turnInfo.round
    });

    console.log(`Pictionary started for game ${pin}, drawer: ${turnInfo.drawerName}`);
    callback({ success: true, ...turnInfo });
  });

  // Host moves to next Pictionary turn
  socket.on('host:next-pictionary-turn', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    if (!game) return callback({ success: false, error: 'Game not found' });

    const turnInfo = game.nextPictionaryTurn();
    if (!turnInfo) return callback({ success: false, error: 'No teams' });

    const drawerSocket = game.teams.get(turnInfo.drawerId)?.socketId;
    if (drawerSocket) {
      io.to(drawerSocket).emit('pictionary:your-turn', { word: game.currentWord });
    }

    io.to(`game-${pin}`).emit('pictionary:round-start', {
      drawerId: turnInfo.drawerId,
      drawerName: turnInfo.drawerName,
      round: turnInfo.round
    });

    callback({ success: true, ...turnInfo });
  });

  // Host ends Pictionary
  socket.on('host:end-pictionary', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    if (!game) return callback({ success: false, error: 'Game not found' });

    const result = game.endGame();
    io.to(`game-${pin}`).emit('game:ended', result);
    callback({ success: true, ...result });
  });

  // Relay drawing strokes from drawer to all players
  socket.on('pictionary:draw', (data) => {
    const { pin, stroke } = data;
    // Broadcast to all in game room except sender
    socket.to(`game-${pin}`).emit('pictionary:draw', { stroke });
  });

  // Clear canvas event
  socket.on('pictionary:clear', (data) => {
    const { pin } = data;
    socket.to(`game-${pin}`).emit('pictionary:clear');
  });

  // Player submits a guess
  socket.on('pictionary:guess', (data, callback) => {
    const { pin, teamId, guess } = data;
    const game = games.get(pin);
    if (!game) return callback({ success: false, error: 'Game not found' });

    const result = game.submitPictionaryGuess(teamId, guess);
    if (!result.valid) return callback({ success: false, message: result.message });

    if (result.isCorrect) {
      // Notify everyone of correct guess
      io.to(`game-${pin}`).emit('pictionary:correct-guess', {
        teamId,
        guesserName: result.guesserName,
        points: result.points,
        word: game.currentWord,
        leaderboard: game.getLeaderboard()
      });
    }

    callback({ success: true, isCorrect: result.isCorrect });
  });

  // ==================== APPLES TO APPLES EVENTS ====================

  // Host starts Apples to Apples
  socket.on('host:start-apples', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    if (!game) return callback({ success: false, error: 'Game not found' });

    game.initApplesToApples();
    const roundInfo = game.startApplesRound();

    // Send each team their hand
    game.applesHands.forEach((hand, teamId) => {
      const team = game.teams.get(teamId);
      if (team) {
        io.to(team.socketId).emit('apples:deal-hand', { hand });
      }
    });

    // Broadcast round info to everyone
    io.to(`game-${pin}`).emit('apples:round-start', {
      greenCard: roundInfo.greenCard,
      judgeId: roundInfo.judgeId,
      judgeName: roundInfo.judgeName,
      round: roundInfo.round
    });

    console.log(`Apples to Apples started for game ${pin}`);
    callback({ success: true, ...roundInfo });
  });

  // Host starts next Apples round
  socket.on('host:next-apples-round', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    if (!game) return callback({ success: false, error: 'Game not found' });

    const roundInfo = game.startApplesRound();

    // Send updated hands
    game.applesHands.forEach((hand, teamId) => {
      const team = game.teams.get(teamId);
      if (team) {
        io.to(team.socketId).emit('apples:deal-hand', { hand });
      }
    });

    io.to(`game-${pin}`).emit('apples:round-start', {
      greenCard: roundInfo.greenCard,
      judgeId: roundInfo.judgeId,
      judgeName: roundInfo.judgeName,
      round: roundInfo.round
    });

    callback({ success: true, ...roundInfo });
  });

  // Player plays a card
  socket.on('apples:play-card', (data, callback) => {
    const { pin, teamId, card } = data;
    const game = games.get(pin);
    if (!game) return callback({ success: false, error: 'Game not found' });

    const result = game.submitApplesCard(teamId, card);
    if (!result.valid) return callback({ success: false, message: result.message });

    const totalPlayers = game.teams.size - 1; // minus judge
    const submittedCount = game.applesSubmissions.size;

    // Notify host of submission count
    io.to(`host-${pin}`).emit('apples:card-submitted', {
      submittedCount,
      totalNeeded: totalPlayers,
      allIn: submittedCount >= totalPlayers
    });

    // If all cards are in, send shuffled submissions to judge
    if (submittedCount >= totalPlayers) {
      const submissions = Array.from(game.applesSubmissions.entries()).map(([tid, c]) => ({
        teamId: tid,
        card: c
      }));
      const shuffledSubmissions = shuffleArray(submissions);
      // Send to judge
      const judge = game.teams.get(game.applesJudgeId);
      if (judge) {
        io.to(judge.socketId).emit('apples:judge-cards', {
          greenCard: game.applesGreenCard,
          submissions: shuffledSubmissions
        });
      }
      io.to(`game-${pin}`).emit('apples:all-cards-in', {
        greenCard: game.applesGreenCard,
        submittedCount
      });
    }

    callback({ success: true, submitted: true });
  });

  // Judge picks winning card
  socket.on('apples:judge-pick', (data, callback) => {
    const { pin, winningTeamId } = data;
    const game = games.get(pin);
    if (!game) return callback({ success: false, error: 'Game not found' });

    const result = game.judgeApples(winningTeamId);
    io.to(`game-${pin}`).emit('apples:round-winner', result);
    callback({ success: true, ...result });
  });

  // Host ends Apples to Apples
  socket.on('host:end-apples', (data, callback) => {
    const { pin } = data;
    const game = games.get(pin);
    if (!game) return callback({ success: false, error: 'Game not found' });

    const result = game.endGame();
    io.to(`game-${pin}`).emit('game:ended', result);
    callback({ success: true, ...result });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove team from games if they disconnect
    games.forEach((game, pin) => {
      game.teams.forEach((team, teamId) => {
        if (team.socketId === socket.id) {
          game.removeTeam(teamId);
          io.to(`host-${pin}`).emit('team:left', {
            teamId: teamId,
            teamName: team.name,
            totalTeams: game.teams.size
          });
        }
      });
      
      // Clean up empty games
      if (game.teams.size === 0 && game.state === 'lobby') {
        games.delete(pin);
        console.log(`Empty game ${pin} removed`);
      }
    });
  });
});

// Cleanup old games periodically (after 2 hours)
setInterval(() => {
  const now = Date.now();
  games.forEach((game, pin) => {
    // Remove games that have been ended for more than 30 minutes
    if (game.state === 'ended') {
      games.delete(pin);
      console.log(`Ended game ${pin} cleaned up`);
    }
  });
}, 30 * 60 * 1000); // Every 30 minutes

server.listen(PORT, () => {
  console.log(`🎮 Bar Trivia Server running on port ${PORT}`);
  console.log(`Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
});
