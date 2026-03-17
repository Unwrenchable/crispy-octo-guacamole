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

// Pre-loaded question banks by genre
const QUESTION_BANKS = {
  sports: [
    { text: "How many players are on a basketball team on the court?", options: ["4", "5", "6", "7"], correctAnswer: "5", category: "Sports" },
    { text: "Which country won the 2018 FIFA World Cup?", options: ["Brazil", "Germany", "France", "Argentina"], correctAnswer: "France", category: "Sports" },
    { text: "What is the diameter of a basketball hoop in inches?", options: ["16", "18", "20", "22"], correctAnswer: "18", category: "Sports" },
    { text: "In which sport would you perform a 'slam dunk'?", options: ["Volleyball", "Basketball", "Tennis", "Baseball"], correctAnswer: "Basketball", category: "Sports" },
    { text: "How many Grand Slam tournaments are there in tennis?", options: ["3", "4", "5", "6"], correctAnswer: "4", category: "Sports" },
    { text: "What is the maximum score in a single frame of bowling?", options: ["10", "20", "30", "300"], correctAnswer: "30", category: "Sports" },
    { text: "How long is an Olympic swimming pool in meters?", options: ["25", "50", "75", "100"], correctAnswer: "50", category: "Sports" },
    { text: "Which sport is known as 'The Beautiful Game'?", options: ["Basketball", "Baseball", "Soccer", "Tennis"], correctAnswer: "Soccer", category: "Sports" },
    { text: "How many holes are played in a standard round of golf?", options: ["9", "12", "18", "24"], correctAnswer: "18", category: "Sports" },
    { text: "What is the national sport of Japan?", options: ["Karate", "Sumo Wrestling", "Judo", "Kendo"], correctAnswer: "Sumo Wrestling", category: "Sports" },
    { text: "How many minutes is each period in an NHL hockey game?", options: ["15", "20", "25", "30"], correctAnswer: "20", category: "Sports" },
    { text: "What is the height of a regulation basketball hoop in feet?", options: ["8", "9", "10", "11"], correctAnswer: "10", category: "Sports" },
    { text: "Which country hosted the 2016 Summer Olympics?", options: ["China", "Brazil", "UK", "Japan"], correctAnswer: "Brazil", category: "Sports" },
    { text: "What is the maximum number of players on a soccer field at once per team?", options: ["9", "10", "11", "12"], correctAnswer: "11", category: "Sports" },
    { text: "In which sport would you find a 'love' score?", options: ["Golf", "Tennis", "Cricket", "Badminton"], correctAnswer: "Tennis", category: "Sports" },
    { text: "How many points is a touchdown worth in American football?", options: ["3", "5", "6", "7"], correctAnswer: "6", category: "Sports" },
    { text: "What color is the center circle on a basketball court?", options: ["Red", "Blue", "Yellow", "It varies"], correctAnswer: "It varies", category: "Sports" },
    { text: "How many bases are on a baseball field?", options: ["3", "4", "5", "6"], correctAnswer: "4", category: "Sports" },
    { text: "What is the term for three strikes in a row in bowling?", options: ["Eagle", "Turkey", "Birdie", "Ace"], correctAnswer: "Turkey", category: "Sports" },
    { text: "Which Grand Slam tennis tournament is played on grass?", options: ["US Open", "French Open", "Wimbledon", "Australian Open"], correctAnswer: "Wimbledon", category: "Sports" }
  ],
  movies: [
    { text: "Who directed 'The Shawshank Redemption'?", options: ["Steven Spielberg", "Frank Darabont", "Martin Scorsese", "Quentin Tarantino"], correctAnswer: "Frank Darabont", category: "Movies" },
    { text: "What year was the first 'Star Wars' movie released?", options: ["1975", "1977", "1979", "1980"], correctAnswer: "1977", category: "Movies" },
    { text: "Which movie won the Oscar for Best Picture in 2020?", options: ["1917", "Joker", "Parasite", "Once Upon a Time in Hollywood"], correctAnswer: "Parasite", category: "Movies" },
    { text: "Who played Iron Man in the Marvel Cinematic Universe?", options: ["Chris Evans", "Robert Downey Jr.", "Chris Hemsworth", "Mark Ruffalo"], correctAnswer: "Robert Downey Jr.", category: "Movies" },
    { text: "What is the highest-grossing film of all time?", options: ["Titanic", "Avatar", "Avengers: Endgame", "Star Wars"], correctAnswer: "Avatar", category: "Movies" },
    { text: "Who directed 'Pulp Fiction'?", options: ["Martin Scorsese", "Quentin Tarantino", "Steven Spielberg", "Christopher Nolan"], correctAnswer: "Quentin Tarantino", category: "Movies" },
    { text: "Which movie features the quote 'Here's looking at you, kid'?", options: ["Gone with the Wind", "Casablanca", "Citizen Kane", "The Maltese Falcon"], correctAnswer: "Casablanca", category: "Movies" },
    { text: "What was the first feature-length animated movie ever released?", options: ["Fantasia", "Snow White", "Pinocchio", "Bambi"], correctAnswer: "Snow White", category: "Movies" },
    { text: "Who played the Joker in 'The Dark Knight'?", options: ["Jack Nicholson", "Jared Leto", "Heath Ledger", "Joaquin Phoenix"], correctAnswer: "Heath Ledger", category: "Movies" },
    { text: "Which movie won Best Picture at the 2022 Oscars?", options: ["CODA", "Dune", "Belfast", "West Side Story"], correctAnswer: "CODA", category: "Movies" },
    { text: "What is the name of the fictional African country in 'Black Panther'?", options: ["Wakanda", "Zamunda", "Genovia", "Krakozhia"], correctAnswer: "Wakanda", category: "Movies" },
    { text: "Which actor has been in the most Marvel movies?", options: ["Chris Evans", "Robert Downey Jr.", "Scarlett Johansson", "Samuel L. Jackson"], correctAnswer: "Samuel L. Jackson", category: "Movies" },
    { text: "What is the name of the hotel in 'The Shining'?", options: ["Bates Motel", "Hotel California", "The Overlook Hotel", "Grand Budapest Hotel"], correctAnswer: "The Overlook Hotel", category: "Movies" },
    { text: "Who composed the score for 'Inception'?", options: ["John Williams", "Hans Zimmer", "Ennio Morricone", "Howard Shore"], correctAnswer: "Hans Zimmer", category: "Movies" },
    { text: "Which movie is known for the line 'You can't handle the truth!'?", options: ["A Few Good Men", "The Verdict", "Philadelphia", "JFK"], correctAnswer: "A Few Good Men", category: "Movies" },
    { text: "What was the first Pixar movie?", options: ["Finding Nemo", "Toy Story", "A Bug's Life", "Monsters Inc."], correctAnswer: "Toy Story", category: "Movies" },
    { text: "Which film won the first ever Oscar for Best Animated Feature?", options: ["Shrek", "Monsters Inc.", "Toy Story", "Finding Nemo"], correctAnswer: "Shrek", category: "Movies" },
    { text: "Who directed 'Jurassic Park'?", options: ["James Cameron", "Steven Spielberg", "George Lucas", "Ridley Scott"], correctAnswer: "Steven Spielberg", category: "Movies" },
    { text: "In which movie does Tom Hanks say 'Life is like a box of chocolates'?", options: ["Cast Away", "Forrest Gump", "Philadelphia", "Big"], correctAnswer: "Forrest Gump", category: "Movies" },
    { text: "Which movie features a character named Hannibal Lecter?", options: ["Psycho", "The Silence of the Lambs", "Seven", "Zodiac"], correctAnswer: "The Silence of the Lambs", category: "Movies" }
  ],
  music: [
    { text: "Who is known as the 'King of Pop'?", options: ["Elvis Presley", "Michael Jackson", "Prince", "Madonna"], correctAnswer: "Michael Jackson", category: "Music" },
    { text: "Which band released the album 'Abbey Road'?", options: ["The Rolling Stones", "The Beatles", "Led Zeppelin", "Pink Floyd"], correctAnswer: "The Beatles", category: "Music" },
    { text: "What instrument does Yo-Yo Ma play?", options: ["Violin", "Piano", "Cello", "Harp"], correctAnswer: "Cello", category: "Music" },
    { text: "Which artist has won the most Grammy Awards?", options: ["Beyoncé", "Michael Jackson", "Quincy Jones", "Georg Solti"], correctAnswer: "Beyoncé", category: "Music" },
    { text: "What year did MTV launch?", options: ["1979", "1981", "1983", "1985"], correctAnswer: "1981", category: "Music" },
    { text: "Who sang 'Purple Rain'?", options: ["Prince", "Michael Jackson", "Whitney Houston", "Stevie Wonder"], correctAnswer: "Prince", category: "Music" },
    { text: "Which band wrote the song 'Bohemian Rhapsody'?", options: ["The Beatles", "Queen", "Led Zeppelin", "Pink Floyd"], correctAnswer: "Queen", category: "Music" },
    { text: "What is Lady Gaga's real name?", options: ["Stefani Germanotta", "Stephanie Gaga", "Stella Germaine", "Stacy Gardner"], correctAnswer: "Stefani Germanotta", category: "Music" },
    { text: "Which female artist has the most Billboard Hot 100 hits?", options: ["Madonna", "Rihanna", "Taylor Swift", "Mariah Carey"], correctAnswer: "Taylor Swift", category: "Music" },
    { text: "What was Elvis Presley's first hit song?", options: ["Jailhouse Rock", "Hound Dog", "Heartbreak Hotel", "Love Me Tender"], correctAnswer: "Heartbreak Hotel", category: "Music" },
    { text: "Which rapper's real name is Marshall Mathers?", options: ["Jay-Z", "Eminem", "Snoop Dogg", "Dr. Dre"], correctAnswer: "Eminem", category: "Music" },
    { text: "What is the best-selling album of all time?", options: ["Back in Black", "The Dark Side of the Moon", "Thriller", "The Bodyguard"], correctAnswer: "Thriller", category: "Music" },
    { text: "Who is known as the 'Queen of Soul'?", options: ["Diana Ross", "Whitney Houston", "Aretha Franklin", "Etta James"], correctAnswer: "Aretha Franklin", category: "Music" },
    { text: "Which country is Shakira from?", options: ["Mexico", "Spain", "Colombia", "Argentina"], correctAnswer: "Colombia", category: "Music" },
    { text: "What instrument did Jimi Hendrix famously play?", options: ["Drums", "Bass", "Guitar", "Keyboard"], correctAnswer: "Guitar", category: "Music" },
    { text: "Which band's lead singer is Bono?", options: ["Coldplay", "Radiohead", "U2", "R.E.M."], correctAnswer: "U2", category: "Music" },
    { text: "What year did Nirvana release 'Nevermind'?", options: ["1989", "1991", "1993", "1995"], correctAnswer: "1991", category: "Music" },
    { text: "Which K-pop group had a hit with 'Gangnam Style'?", options: ["BTS", "PSY", "BlackPink", "EXO"], correctAnswer: "PSY", category: "Music" },
    { text: "Who composed the 'Four Seasons'?", options: ["Mozart", "Bach", "Vivaldi", "Beethoven"], correctAnswer: "Vivaldi", category: "Music" },
    { text: "Which artist released the album '21' in 2011?", options: ["Adele", "Taylor Swift", "Beyoncé", "Rihanna"], correctAnswer: "Adele", category: "Music" }
  ],
  science: [
    { text: "What is the chemical symbol for gold?", options: ["Go", "Au", "Gd", "Ag"], correctAnswer: "Au", category: "Science" },
    { text: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], correctAnswer: "8", category: "Science" },
    { text: "What is the speed of light?", options: ["299,792 km/s", "300,000 km/s", "250,000 km/s", "350,000 km/s"], correctAnswer: "299,792 km/s", category: "Science" },
    { text: "What is the largest organ in the human body?", options: ["Heart", "Brain", "Liver", "Skin"], correctAnswer: "Skin", category: "Science" },
    { text: "What gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctAnswer: "Carbon Dioxide", category: "Science" },
    { text: "What is the chemical formula for water?", options: ["H2O", "CO2", "O2", "H2O2"], correctAnswer: "H2O", category: "Science" },
    { text: "What is the hardest natural substance on Earth?", options: ["Gold", "Iron", "Diamond", "Platinum"], correctAnswer: "Diamond", category: "Science" },
    { text: "What is the center of an atom called?", options: ["Electron", "Proton", "Neutron", "Nucleus"], correctAnswer: "Nucleus", category: "Science" },
    { text: "What planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctAnswer: "Mars", category: "Science" },
    { text: "How many bones are in the adult human body?", options: ["186", "206", "226", "246"], correctAnswer: "206", category: "Science" },
    { text: "What is the study of stars and planets called?", options: ["Geology", "Biology", "Astronomy", "Meteorology"], correctAnswer: "Astronomy", category: "Science" },
    { text: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"], correctAnswer: "Mitochondria", category: "Science" },
    { text: "What is the boiling point of water in Celsius?", options: ["90°C", "100°C", "110°C", "120°C"], correctAnswer: "100°C", category: "Science" },
    { text: "What force keeps planets in orbit around the sun?", options: ["Magnetism", "Gravity", "Friction", "Inertia"], correctAnswer: "Gravity", category: "Science" },
    { text: "What is the most abundant gas in Earth's atmosphere?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correctAnswer: "Nitrogen", category: "Science" },
    { text: "What is the process by which plants make food?", options: ["Respiration", "Photosynthesis", "Digestion", "Fermentation"], correctAnswer: "Photosynthesis", category: "Science" },
    { text: "What type of animal is a dolphin?", options: ["Fish", "Mammal", "Reptile", "Amphibian"], correctAnswer: "Mammal", category: "Science" },
    { text: "What is the largest planet in our solar system?", options: ["Saturn", "Jupiter", "Neptune", "Uranus"], correctAnswer: "Jupiter", category: "Science" },
    { text: "What is the symbol for the element oxygen?", options: ["O", "Ox", "O2", "Om"], correctAnswer: "O", category: "Science" },
    { text: "How long does it take light from the Sun to reach Earth?", options: ["8 seconds", "8 minutes", "8 hours", "8 days"], correctAnswer: "8 minutes", category: "Science" }
  ],
  history: [
    { text: "In what year did World War II end?", options: ["1943", "1944", "1945", "1946"], correctAnswer: "1945", category: "History" },
    { text: "Who was the first President of the United States?", options: ["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"], correctAnswer: "George Washington", category: "History" },
    { text: "Which ancient wonder still stands today?", options: ["Hanging Gardens", "Colossus of Rhodes", "Great Pyramid of Giza", "Lighthouse of Alexandria"], correctAnswer: "Great Pyramid of Giza", category: "History" },
    { text: "What year did the Berlin Wall fall?", options: ["1987", "1988", "1989", "1990"], correctAnswer: "1989", category: "History" },
    { text: "Who painted the Mona Lisa?", options: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"], correctAnswer: "Leonardo da Vinci", category: "History" },
    { text: "What year did Christopher Columbus reach the Americas?", options: ["1492", "1500", "1520", "1450"], correctAnswer: "1492", category: "History" },
    { text: "Who was the first man to walk on the moon?", options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "John Glenn"], correctAnswer: "Neil Armstrong", category: "History" },
    { text: "Which empire built Machu Picchu?", options: ["Aztec", "Maya", "Inca", "Olmec"], correctAnswer: "Inca", category: "History" },
    { text: "What year did the Titanic sink?", options: ["1910", "1912", "1914", "1916"], correctAnswer: "1912", category: "History" },
    { text: "Who was the British Prime Minister during World War II?", options: ["Neville Chamberlain", "Winston Churchill", "Clement Attlee", "Anthony Eden"], correctAnswer: "Winston Churchill", category: "History" },
    { text: "What was the name of the first atomic bomb?", options: ["Fat Man", "Little Boy", "Trinity", "Big Ivan"], correctAnswer: "Little Boy", category: "History" },
    { text: "Which civilization built the pyramids?", options: ["Romans", "Greeks", "Egyptians", "Persians"], correctAnswer: "Egyptians", category: "History" },
    { text: "What year did the United States declare independence?", options: ["1774", "1775", "1776", "1777"], correctAnswer: "1776", category: "History" },
    { text: "Who invented the telephone?", options: ["Thomas Edison", "Nikola Tesla", "Alexander Graham Bell", "Guglielmo Marconi"], correctAnswer: "Alexander Graham Bell", category: "History" },
    { text: "What ancient city was destroyed by a volcano in 79 AD?", options: ["Athens", "Rome", "Pompeii", "Carthage"], correctAnswer: "Pompeii", category: "History" },
    { text: "Who was known as the 'Iron Lady'?", options: ["Margaret Thatcher", "Indira Gandhi", "Golda Meir", "Angela Merkel"], correctAnswer: "Margaret Thatcher", category: "History" },
    { text: "What was the name of the ship on which Charles Darwin sailed?", options: ["HMS Victory", "HMS Beagle", "Santa Maria", "Mayflower"], correctAnswer: "HMS Beagle", category: "History" },
    { text: "Which war lasted from 1950 to 1953?", options: ["Vietnam War", "Korean War", "Cold War", "Gulf War"], correctAnswer: "Korean War", category: "History" },
    { text: "Who wrote 'The Communist Manifesto'?", options: ["Vladimir Lenin", "Joseph Stalin", "Karl Marx", "Leon Trotsky"], correctAnswer: "Karl Marx", category: "History" },
    { text: "What year did the Soviet Union collapse?", options: ["1989", "1990", "1991", "1992"], correctAnswer: "1991", category: "History" }
  ],
  geography: [
    { text: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Brisbane"], correctAnswer: "Canberra", category: "Geography" },
    { text: "Which river is the longest in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correctAnswer: "Nile", category: "Geography" },
    { text: "How many continents are there?", options: ["5", "6", "7", "8"], correctAnswer: "7", category: "Geography" },
    { text: "What is the smallest country in the world?", options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], correctAnswer: "Vatican City", category: "Geography" },
    { text: "Which desert is the largest in the world?", options: ["Sahara", "Arabian", "Gobi", "Antarctic"], correctAnswer: "Antarctic", category: "Geography" },
    { text: "What is the capital of Canada?", options: ["Toronto", "Vancouver", "Montreal", "Ottawa"], correctAnswer: "Ottawa", category: "Geography" },
    { text: "Which country has the most natural lakes?", options: ["USA", "Canada", "Russia", "Finland"], correctAnswer: "Canada", category: "Geography" },
    { text: "What is the highest mountain in the world?", options: ["K2", "Mount Everest", "Kangchenjunga", "Makalu"], correctAnswer: "Mount Everest", category: "Geography" },
    { text: "Which ocean is the largest?", options: ["Atlantic", "Indian", "Pacific", "Arctic"], correctAnswer: "Pacific", category: "Geography" },
    { text: "What is the capital of Japan?", options: ["Osaka", "Kyoto", "Tokyo", "Yokohama"], correctAnswer: "Tokyo", category: "Geography" },
    { text: "Which country is both in Europe and Asia?", options: ["Russia", "Turkey", "Kazakhstan", "All of the above"], correctAnswer: "All of the above", category: "Geography" },
    { text: "What is the longest river in Europe?", options: ["Danube", "Rhine", "Volga", "Thames"], correctAnswer: "Volga", category: "Geography" },
    { text: "Which country has the most time zones?", options: ["USA", "Russia", "France", "China"], correctAnswer: "France", category: "Geography" },
    { text: "What is the capital of Brazil?", options: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"], correctAnswer: "Brasília", category: "Geography" },
    { text: "Which mountain range separates Europe and Asia?", options: ["Himalayas", "Alps", "Ural Mountains", "Rocky Mountains"], correctAnswer: "Ural Mountains", category: "Geography" },
    { text: "What is the largest island in the world?", options: ["Australia", "Greenland", "New Guinea", "Borneo"], correctAnswer: "Greenland", category: "Geography" },
    { text: "Which country has the longest coastline?", options: ["Australia", "Russia", "Canada", "Indonesia"], correctAnswer: "Canada", category: "Geography" },
    { text: "What is the driest place on Earth?", options: ["Death Valley", "Sahara Desert", "Atacama Desert", "Arabian Desert"], correctAnswer: "Atacama Desert", category: "Geography" },
    { text: "Which European capital is known as the 'City of Love'?", options: ["Rome", "Paris", "Venice", "Vienna"], correctAnswer: "Paris", category: "Geography" },
    { text: "What is the southernmost continent?", options: ["Australia", "South America", "Africa", "Antarctica"], correctAnswer: "Antarctica", category: "Geography" }
  ],
  "pop-culture": [
    { text: "What is the most-watched series on Netflix?", options: ["Stranger Things", "Squid Game", "Wednesday", "The Crown"], correctAnswer: "Squid Game", category: "Pop Culture" },
    { text: "Who is the author of Harry Potter?", options: ["J.R.R. Tolkien", "J.K. Rowling", "Stephen King", "George R.R. Martin"], correctAnswer: "J.K. Rowling", category: "Pop Culture" },
    { text: "What social media platform uses a bird as its logo?", options: ["Facebook", "Instagram", "Twitter", "Snapchat"], correctAnswer: "Twitter", category: "Pop Culture" },
    { text: "Which video game character is known for eating mushrooms?", options: ["Sonic", "Mario", "Link", "Pac-Man"], correctAnswer: "Mario", category: "Pop Culture" },
    { text: "What year was Facebook founded?", options: ["2002", "2004", "2006", "2008"], correctAnswer: "2004", category: "Pop Culture" },
    { text: "What is the name of the coffee shop in 'Friends'?", options: ["Central Perk", "Java Joe's", "Brew Haven", "Coffee Spot"], correctAnswer: "Central Perk", category: "Pop Culture" },
    { text: "Which artist performed at the 2023 Super Bowl halftime show?", options: ["The Weeknd", "Rihanna", "Beyoncé", "Lady Gaga"], correctAnswer: "Rihanna", category: "Pop Culture" },
    { text: "What is the name of the fictional kingdom in 'Frozen'?", options: ["Atlantis", "Narnia", "Arendelle", "Camelot"], correctAnswer: "Arendelle", category: "Pop Culture" },
    { text: "Which streaming service produces 'The Mandalorian'?", options: ["Netflix", "Hulu", "Disney+", "Amazon Prime"], correctAnswer: "Disney+", category: "Pop Culture" },
    { text: "What does 'LOL' stand for?", options: ["Lots of Love", "Laugh Out Loud", "Living Online", "Loss of Life"], correctAnswer: "Laugh Out Loud", category: "Pop Culture" },
    { text: "Who voiced Woody in 'Toy Story'?", options: ["Tim Allen", "Tom Hanks", "Bill Murray", "Robin Williams"], correctAnswer: "Tom Hanks", category: "Pop Culture" },
    { text: "What is the most subscribed YouTube channel?", options: ["PewDiePie", "MrBeast", "T-Series", "Cocomelon"], correctAnswer: "T-Series", category: "Pop Culture" },
    { text: "Which app is known for short-form videos?", options: ["Instagram", "Snapchat", "TikTok", "Vine"], correctAnswer: "TikTok", category: "Pop Culture" },
    { text: "What is the name of Baby Yoda's species?", options: ["Yoda", "The Child", "Unknown", "Grogu"], correctAnswer: "Unknown", category: "Pop Culture" },
    { text: "Which celebrity couple is known as 'Brangelina'?", options: ["Brad Pitt & Jennifer Aniston", "Brad Pitt & Angelina Jolie", "Ben Affleck & Jennifer Lopez", "Bradley Cooper & Lady Gaga"], correctAnswer: "Brad Pitt & Angelina Jolie", category: "Pop Culture" },
    { text: "What is the highest-grossing video game franchise?", options: ["Pokémon", "Mario", "Call of Duty", "Grand Theft Auto"], correctAnswer: "Pokémon", category: "Pop Culture" },
    { text: "Which TV show features the character 'Eleven'?", options: ["The Umbrella Academy", "Stranger Things", "The Boys", "Dark"], correctAnswer: "Stranger Things", category: "Pop Culture" },
    { text: "What was Twitter's character limit originally?", options: ["100", "140", "200", "280"], correctAnswer: "140", category: "Pop Culture" },
    { text: "Who is the most followed person on Instagram?", options: ["Cristiano Ronaldo", "Kylie Jenner", "Selena Gomez", "The Rock"], correctAnswer: "Cristiano Ronaldo", category: "Pop Culture" },
    { text: "What year did the first iPhone release?", options: ["2005", "2007", "2009", "2011"], correctAnswer: "2007", category: "Pop Culture" }
  ],
  "food-drink": [
    { text: "What is the main ingredient in guacamole?", options: ["Tomato", "Avocado", "Pepper", "Onion"], correctAnswer: "Avocado", category: "Food & Drink" },
    { text: "Which country is the origin of the cocktail Mojito?", options: ["Mexico", "Cuba", "Brazil", "Spain"], correctAnswer: "Cuba", category: "Food & Drink" },
    { text: "What type of pasta is shaped like a butterfly?", options: ["Penne", "Rigatoni", "Farfalle", "Fusilli"], correctAnswer: "Farfalle", category: "Food & Drink" },
    { text: "Which fruit has the highest vitamin C content?", options: ["Orange", "Lemon", "Kiwi", "Guava"], correctAnswer: "Guava", category: "Food & Drink" },
    { text: "What is the main ingredient in Japanese miso soup?", options: ["Soy sauce", "Miso paste", "Rice", "Fish"], correctAnswer: "Miso paste", category: "Food & Drink" },
    { text: "What is the most expensive spice in the world?", options: ["Vanilla", "Saffron", "Cardamom", "Cinnamon"], correctAnswer: "Saffron", category: "Food & Drink" },
    { text: "Which country invented pizza?", options: ["France", "Greece", "Italy", "Spain"], correctAnswer: "Italy", category: "Food & Drink" },
    { text: "What is the main ingredient in hummus?", options: ["Lentils", "Chickpeas", "Black beans", "Kidney beans"], correctAnswer: "Chickpeas", category: "Food & Drink" },
    { text: "What type of alcohol is made from agave?", options: ["Rum", "Tequila", "Vodka", "Gin"], correctAnswer: "Tequila", category: "Food & Drink" },
    { text: "Which fruit is known as the 'king of fruits'?", options: ["Mango", "Durian", "Pineapple", "Papaya"], correctAnswer: "Durian", category: "Food & Drink" },
    { text: "What is the base spirit in a Margarita?", options: ["Vodka", "Rum", "Tequila", "Gin"], correctAnswer: "Tequila", category: "Food & Drink" },
    { text: "Which cheese is traditionally used on pizza?", options: ["Cheddar", "Mozzarella", "Parmesan", "Gouda"], correctAnswer: "Mozzarella", category: "Food & Drink" },
    { text: "What is the national dish of Spain?", options: ["Paella", "Tapas", "Gazpacho", "Churros"], correctAnswer: "Paella", category: "Food & Drink" },
    { text: "What is the main ingredient in traditional Japanese sake?", options: ["Rice", "Wheat", "Barley", "Corn"], correctAnswer: "Rice", category: "Food & Drink" },
    { text: "Which nut is used to make marzipan?", options: ["Walnut", "Cashew", "Almond", "Pistachio"], correctAnswer: "Almond", category: "Food & Drink" },
    { text: "What color is Coca-Cola originally?", options: ["Brown", "Black", "Green", "Red"], correctAnswer: "Brown", category: "Food & Drink" },
    { text: "What is the most consumed beverage in the world after water?", options: ["Coffee", "Tea", "Beer", "Milk"], correctAnswer: "Tea", category: "Food & Drink" },
    { text: "Which vegetable is used to make sauerkraut?", options: ["Carrot", "Cabbage", "Cucumber", "Beet"], correctAnswer: "Cabbage", category: "Food & Drink" },
    { text: "What is the main ingredient in tahini?", options: ["Chickpeas", "Peanuts", "Sesame seeds", "Sunflower seeds"], correctAnswer: "Sesame seeds", category: "Food & Drink" },
    { text: "Which country consumes the most coffee per capita?", options: ["USA", "Italy", "Finland", "Brazil"], correctAnswer: "Finland", category: "Food & Drink" }
  ],
  technology: [
    { text: "Who is the founder of Microsoft?", options: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Elon Musk"], correctAnswer: "Bill Gates", category: "Technology" },
    { text: "What does 'HTTP' stand for?", options: ["HyperText Transfer Protocol", "High Tech Transfer Protocol", "Home Tool Transfer Protocol", "HyperText Transmission Process"], correctAnswer: "HyperText Transfer Protocol", category: "Technology" },
    { text: "What year was the first iPhone released?", options: ["2005", "2007", "2009", "2011"], correctAnswer: "2007", category: "Technology" },
    { text: "What does 'CPU' stand for?", options: ["Central Processing Unit", "Computer Personal Unit", "Central Processor Universal", "Computer Processing Utility"], correctAnswer: "Central Processing Unit", category: "Technology" },
    { text: "Which company developed the Android operating system?", options: ["Apple", "Microsoft", "Google", "Samsung"], correctAnswer: "Google", category: "Technology" },
    { text: "What is the name of Apple's virtual assistant?", options: ["Alexa", "Cortana", "Siri", "Google Assistant"], correctAnswer: "Siri", category: "Technology" },
    { text: "What does 'AI' stand for?", options: ["Automated Intelligence", "Artificial Intelligence", "Advanced Interface", "Automatic Integration"], correctAnswer: "Artificial Intelligence", category: "Technology" },
    { text: "Which programming language is known for its use in web development?", options: ["Python", "JavaScript", "C++", "Swift"], correctAnswer: "JavaScript", category: "Technology" },
    { text: "What is the maximum capacity of a standard Blu-ray disc?", options: ["25 GB", "50 GB", "100 GB", "200 GB"], correctAnswer: "50 GB", category: "Technology" },
    { text: "Who founded Tesla Motors?", options: ["Bill Gates", "Steve Jobs", "Elon Musk", "Jeff Bezos"], correctAnswer: "Elon Musk", category: "Technology" },
    { text: "What does 'URL' stand for?", options: ["Universal Resource Locator", "Uniform Resource Locator", "Universal Reference Link", "Uniform Reference Locator"], correctAnswer: "Uniform Resource Locator", category: "Technology" },
    { text: "Which company owns Instagram?", options: ["Twitter", "Google", "Meta (Facebook)", "Snapchat"], correctAnswer: "Meta (Facebook)", category: "Technology" },
    { text: "What is the name of Amazon's cloud computing platform?", options: ["Azure", "AWS", "Google Cloud", "iCloud"], correctAnswer: "AWS", category: "Technology" },
    { text: "What does 'RAM' stand for?", options: ["Random Access Memory", "Rapid Access Memory", "Read Access Memory", "Remote Access Memory"], correctAnswer: "Random Access Memory", category: "Technology" },
    { text: "Which social media platform has a maximum post length of 280 characters?", options: ["Facebook", "Instagram", "Twitter", "LinkedIn"], correctAnswer: "Twitter", category: "Technology" },
    { text: "What is the most popular programming language in 2023?", options: ["Java", "Python", "C++", "JavaScript"], correctAnswer: "Python", category: "Technology" },
    { text: "Which company developed the Windows operating system?", options: ["Apple", "Google", "Microsoft", "IBM"], correctAnswer: "Microsoft", category: "Technology" },
    { text: "What does 'USB' stand for?", options: ["Universal Serial Bus", "Universal System Bus", "Unified Serial Bus", "Universal Service Bus"], correctAnswer: "Universal Serial Bus", category: "Technology" },
    { text: "What is the name of Google's web browser?", options: ["Firefox", "Safari", "Chrome", "Edge"], correctAnswer: "Chrome", category: "Technology" },
    { text: "Which company created the PlayStation?", options: ["Microsoft", "Nintendo", "Sony", "Sega"], correctAnswer: "Sony", category: "Technology" }
  ],
  games: [
    { text: "What is the best-selling video game of all time?", options: ["Tetris", "Minecraft", "GTA V", "Wii Sports"], correctAnswer: "Minecraft", category: "Games" },
    { text: "In which year was the first Super Mario Bros. game released?", options: ["1983", "1985", "1987", "1989"], correctAnswer: "1985", category: "Games" },
    { text: "What is the name of the main character in The Legend of Zelda?", options: ["Zelda", "Link", "Ganon", "Mario"], correctAnswer: "Link", category: "Games" },
    { text: "Which game features the character 'Master Chief'?", options: ["Call of Duty", "Halo", "Destiny", "Gears of War"], correctAnswer: "Halo", category: "Games" },
    { text: "What is the currency called in Fortnite?", options: ["Gold", "Credits", "V-Bucks", "Coins"], correctAnswer: "V-Bucks", category: "Games" },
    { text: "Which company created the game 'The Witcher 3'?", options: ["Bethesda", "Ubisoft", "CD Projekt Red", "BioWare"], correctAnswer: "CD Projekt Red", category: "Games" },
    { text: "What is the maximum level in Pokémon games?", options: ["99", "100", "150", "255"], correctAnswer: "100", category: "Games" },
    { text: "Which game series features the character Kratos?", options: ["God of War", "Devil May Cry", "Dark Souls", "Assassin's Creed"], correctAnswer: "God of War", category: "Games" },
    { text: "What is the name of the battle royale mode in Call of Duty?", options: ["Battle Royale", "Warzone", "Blackout", "Survival"], correctAnswer: "Warzone", category: "Games" },
    { text: "Which game won Game of the Year at The Game Awards 2022?", options: ["God of War Ragnarök", "Elden Ring", "Horizon Forbidden West", "Stray"], correctAnswer: "Elden Ring", category: "Games" },
    { text: "What is the main objective in Among Us?", options: ["Build structures", "Complete tasks or eliminate crew", "Collect coins", "Race to finish"], correctAnswer: "Complete tasks or eliminate crew", category: "Games" },
    { text: "Which game series is known for the phrase 'Would you kindly'?", options: ["Half-Life", "BioShock", "Dishonored", "Portal"], correctAnswer: "BioShock", category: "Games" },
    { text: "What is the name of the default skin in Minecraft?", options: ["Alex", "Steve", "Creeper", "Enderman"], correctAnswer: "Steve", category: "Games" },
    { text: "Which Pokémon is number 001 in the National Pokédex?", options: ["Pikachu", "Charmander", "Bulbasaur", "Mew"], correctAnswer: "Bulbasaur", category: "Games" },
    { text: "What gaming console is known for its motion controls?", options: ["PlayStation 4", "Xbox One", "Nintendo Wii", "Sega Genesis"], correctAnswer: "Nintendo Wii", category: "Games" },
    { text: "Which game features a post-apocalyptic world with 'vaults'?", options: ["The Last of Us", "Metro", "Fallout", "Dying Light"], correctAnswer: "Fallout", category: "Games" },
    { text: "What is the name of the main antagonist in Portal?", options: ["Wheatley", "GLaDOS", "Cave Johnson", "Chell"], correctAnswer: "GLaDOS", category: "Games" },
    { text: "Which racing game series is known for realistic simulation?", options: ["Mario Kart", "Need for Speed", "Gran Turismo", "Burnout"], correctAnswer: "Gran Turismo", category: "Games" },
    { text: "What is the name of the in-game currency in Roblox?", options: ["Credits", "Robux", "Coins", "Bucks"], correctAnswer: "Robux", category: "Games" },
    { text: "Which game popularized the 'battle royale' genre?", options: ["Fortnite", "PUBG", "Apex Legends", "H1Z1"], correctAnswer: "PUBG", category: "Games" }
  ],
  'las-vegas': [
    { text: "What is the nickname for the Las Vegas Strip?", options: ["The Boulevard", "The Neon Mile", "The Golden Road", "The Strip"], correctAnswer: "The Strip", category: "🎰 Las Vegas" },
    { text: "Which famous Las Vegas hotel has a replica of the Eiffel Tower?", options: ["Bellagio", "Paris Las Vegas", "Caesars Palace", "Wynn"], correctAnswer: "Paris Las Vegas", category: "🎰 Las Vegas" },
    { text: "What year was Las Vegas officially incorporated as a city?", options: ["1900", "1905", "1910", "1915"], correctAnswer: "1905", category: "🎰 Las Vegas" },
    { text: "The Bellagio fountains use water from which lake?", options: ["Lake Mead", "Lake Las Vegas", "An artificial reservoir", "Underground wells"], correctAnswer: "An artificial reservoir", category: "🎰 Las Vegas" },
    { text: "What is the name of the famous welcome sign on Las Vegas Blvd?", options: ["Welcome to Fabulous Las Vegas Nevada", "Viva Las Vegas", "What Happens Here Stays Here", "City of Lights"], correctAnswer: "Welcome to Fabulous Las Vegas Nevada", category: "🎰 Las Vegas" },
    { text: "Which Las Vegas casino resort is known for its volcano attraction?", options: ["MGM Grand", "Treasure Island", "The Mirage", "Luxor"], correctAnswer: "The Mirage", category: "🎰 Las Vegas" },
    { text: "What shape is the Luxor hotel in Las Vegas?", options: ["Pyramid", "Cylinder", "Dome", "Tower"], correctAnswer: "Pyramid", category: "🎰 Las Vegas" },
    { text: "Which famous comedian has performed a long-running residency at Caesar's Palace?", options: ["Jerry Seinfeld", "Dave Chappelle", "Kevin Hart", "Gabriel Iglesias"], correctAnswer: "Jerry Seinfeld", category: "🎰 Las Vegas" },
    { text: "How many miles long is the Las Vegas Strip (roughly)?", options: ["2 miles", "4 miles", "6 miles", "8 miles"], correctAnswer: "4 miles", category: "🎰 Las Vegas" },
    { text: "What is the name of the indoor roller coaster inside the New York-New York casino?", options: ["Big Apple Coaster", "NYC Express", "The Manhattan", "Empire Ride"], correctAnswer: "Big Apple Coaster", category: "🎰 Las Vegas" },
    { text: "Fremont Street is famous for its massive LED canopy. How long is it?", options: ["1,500 feet", "3,000 feet", "4,500 feet", "1 mile"], correctAnswer: "1,500 feet", category: "🎰 Las Vegas" },
    { text: "Which Las Vegas hotel was once the tallest building west of the Mississippi?", options: ["MGM Grand", "Stratosphere Tower", "Wynn", "Caesars Palace"], correctAnswer: "Stratosphere Tower", category: "🎰 Las Vegas" },
    { text: "What is the average temperature in Las Vegas during July (°F)?", options: ["85°F", "95°F", "105°F", "115°F"], correctAnswer: "105°F", category: "🎰 Las Vegas" },
    { text: "Which famous rock band is based in Las Vegas?", options: ["Imagine Dragons", "The Killers", "3 Doors Down", "Both A and B"], correctAnswer: "Both A and B", category: "🎰 Las Vegas" },
    { text: "What landmark is located about 30 miles from Las Vegas?", options: ["Grand Canyon", "Hoover Dam", "Zion National Park", "Death Valley"], correctAnswer: "Hoover Dam", category: "🎰 Las Vegas" },
    { text: "Las Vegas is located in which Nevada county?", options: ["Washoe County", "Clark County", "Nye County", "Douglas County"], correctAnswer: "Clark County", category: "🎰 Las Vegas" },
    { text: "Which mini golf and entertainment venue is known as Putters on the Strip?", options: ["Adventure Golf", "Putters Vegas", "Mini Golf Palace", "The Putter Club"], correctAnswer: "Putters Vegas", category: "🎰 Las Vegas" },
    { text: "What is the name of the famous Las Vegas magic duo who performed at the Mirage for years?", options: ["Penn & Teller", "Siegfried & Roy", "David & Goliath", "Copperfield & White"], correctAnswer: "Siegfried & Roy", category: "🎰 Las Vegas" },
    { text: "Which area just west of Las Vegas is known for red rock formations?", options: ["Valley of Fire", "Red Rock Canyon", "Boulder City", "Henderson"], correctAnswer: "Red Rock Canyon", category: "🎰 Las Vegas" },
    { text: "What is the population of Las Vegas metro area (approximately)?", options: ["500,000", "1 million", "2 million", "3 million"], correctAnswer: "2 million", category: "🎰 Las Vegas" },
    { text: "Which legendary entertainer was known as 'Mr. Las Vegas'?", options: ["Frank Sinatra", "Dean Martin", "Wayne Newton", "Sammy Davis Jr."], correctAnswer: "Wayne Newton", category: "🎰 Las Vegas" },
    { text: "How many visitors does Las Vegas attract annually (approximately)?", options: ["20 million", "30 million", "40 million", "50 million"], correctAnswer: "40 million", category: "🎰 Las Vegas" },
    { text: "The High Roller observation wheel opened in Las Vegas in what year?", options: ["2010", "2012", "2014", "2016"], correctAnswer: "2014", category: "🎰 Las Vegas" },
    { text: "Which neighborhood in Las Vegas is known for its arts district?", options: ["Downtown Container Park area", "The Arts District", "18b Arts District", "Fremont East"], correctAnswer: "18b Arts District", category: "🎰 Las Vegas" },
    { text: "What is the name of the massive indoor entertainment sphere that opened in Las Vegas in 2023?", options: ["The Globe", "Sphere", "The Orb", "Vegas Dome"], correctAnswer: "Sphere", category: "🎰 Las Vegas" }
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

  // Load questions from pre-loaded bank
  loadQuestionsFromBank(count = 10) {
    let questionPool = [];
    
    if (this.genre === 'mixed') {
      // Mix questions from all genres
      Object.values(QUESTION_BANKS).forEach(bank => {
        questionPool = questionPool.concat(bank);
      });
    } else if (QUESTION_BANKS[this.genre]) {
      questionPool = [...QUESTION_BANKS[this.genre]];
    }

    // Filter out already used questions (based on text to avoid repeats in session)
    const usedTexts = new Set(this.questions.map(q => q.text));
    const availableQuestions = questionPool.filter(q => !usedTexts.has(q.text));
    
    // If all available questions have been used, use the full pool (allows repeats)
    const questionsToUse = availableQuestions.length > 0 ? availableQuestions : questionPool;

    // Shuffle and select questions
    const shuffled = questionsToUse.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    
    // Set time limits based on game mode
    let timeLimit = 30; // Default for classic
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
    
    callback({
      success: true,
      questionsCount: questionsLoaded
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
