-- =====================================================================
-- Zoekertje examen-database
-- Types: varchar / integer / double / boolean (Postgres-vriendelijk)
-- Lange kolomnamen ingekort waar > 12 chars (cursustermen behouden)
-- =====================================================================
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS Bod;
DROP TABLE IF EXISTS Foto;
DROP TABLE IF EXISTS Materiaal_Zoekertje;
DROP TABLE IF EXISTS Kleur_Zoekertje;
DROP TABLE IF EXISTS Zoekertje;
DROP TABLE IF EXISTS Categorie;
DROP TABLE IF EXISTS Rubriek;
DROP TABLE IF EXISTS Afdeling;
DROP TABLE IF EXISTS Prijstype;
DROP TABLE IF EXISTS Meubelstijl;
DROP TABLE IF EXISTS Vorm;
DROP TABLE IF EXISTS Materiaal;
DROP TABLE IF EXISTS Kleur;
DROP TABLE IF EXISTS Gebruiker;

CREATE TABLE Gebruiker (
    gebruikersnaam VARCHAR(50)  PRIMARY KEY,
    emailadres     VARCHAR(255) NOT NULL UNIQUE,
    paswoord       VARCHAR(255) NOT NULL,
    postcode       VARCHAR(10)  NOT NULL,
    plaats         VARCHAR(100) NOT NULL,
    telefoon       VARCHAR(20),
    voorwaarden    BOOLEAN      NOT NULL,
    lidsinds       VARCHAR(10)  NOT NULL,
    emailverif     BOOLEAN      NOT NULL,
    geslacht       VARCHAR(1)
);

CREATE TABLE Afdeling (
    ID           INTEGER      PRIMARY KEY,
    omschrijving VARCHAR(100) NOT NULL
);

CREATE TABLE Rubriek (
    ID           INTEGER      PRIMARY KEY,
    omschrijving VARCHAR(100) NOT NULL,
    afdelingID   INTEGER      NOT NULL REFERENCES Afdeling(ID)
);

CREATE TABLE Categorie (
    ID           INTEGER      PRIMARY KEY,
    omschrijving VARCHAR(100) NOT NULL,
    rubriekID    INTEGER      NOT NULL REFERENCES Rubriek(ID)
);

CREATE TABLE Prijstype (
    ID           INTEGER     PRIMARY KEY,
    omschrijving VARCHAR(50)
);

CREATE TABLE Meubelstijl (
    ID    INTEGER      PRIMARY KEY,
    stijl VARCHAR(100)
);

CREATE TABLE Vorm (
    ID   INTEGER      PRIMARY KEY,
    vorm VARCHAR(100)
);

CREATE TABLE Kleur (
    ID    INTEGER     PRIMARY KEY,
    kleur VARCHAR(50) NOT NULL
);

CREATE TABLE Materiaal (
    ID        INTEGER     PRIMARY KEY,
    materiaal VARCHAR(50) NOT NULL
);

CREATE TABLE Zoekertje (
    zoekertjeID    INTEGER       PRIMARY KEY,
    gebruikersnaam VARCHAR(50)   NOT NULL REFERENCES Gebruiker(gebruikersnaam),
    categorieID    INTEGER       NOT NULL REFERENCES Categorie(ID),
    titel          VARCHAR(75)   NOT NULL,
    beschrijving   VARCHAR(2000),
    prijstypeID    INTEGER       REFERENCES Prijstype(ID),
    prijs          DOUBLE,
    biedenok       BOOLEAN       NOT NULL,
    biedenvanaf    DOUBLE,
    ophalen        BOOLEAN       NOT NULL,
    verzenden      BOOLEAN       NOT NULL,
    url            VARCHAR(255),
    breedte        INTEGER,
    hoogte         INTEGER,
    diepte         INTEGER,
    stijlID        INTEGER       REFERENCES Meubelstijl(ID),
    vormID         INTEGER       REFERENCES Vorm(ID)
);

CREATE TABLE Kleur_Zoekertje (
    kleurID     INTEGER NOT NULL REFERENCES Kleur(ID),
    zoekertjeID INTEGER NOT NULL REFERENCES Zoekertje(zoekertjeID),
    PRIMARY KEY (kleurID, zoekertjeID)
);

CREATE TABLE Materiaal_Zoekertje (
    materiaalID INTEGER NOT NULL REFERENCES Materiaal(ID),
    zoekertjeID INTEGER NOT NULL REFERENCES Zoekertje(zoekertjeID),
    PRIMARY KEY (materiaalID, zoekertjeID)
);

CREATE TABLE Foto (
    ID          INTEGER      PRIMARY KEY,
    url         VARCHAR(255) NOT NULL,
    zoekertjeID INTEGER      NOT NULL REFERENCES Zoekertje(zoekertjeID)
);

CREATE TABLE Bod (
    ID             INTEGER     PRIMARY KEY,
    bod            DOUBLE      NOT NULL,
    datum          VARCHAR(10) NOT NULL,
    zoekertjeID    INTEGER     NOT NULL REFERENCES Zoekertje(zoekertjeID),
    gebruikersnaam VARCHAR(50) NOT NULL REFERENCES Gebruiker(gebruikersnaam)
);

-- ---------------------------------------------------------------------
-- SEED DATA
-- ---------------------------------------------------------------------
INSERT INTO Afdeling (ID, omschrijving) VALUES
 (1,'Huis & Inrichting'),(2,'Vrije tijd'),(3,'Diensten'),(4,'Vervoer');

INSERT INTO Rubriek (ID, omschrijving, afdelingID) VALUES
 (10,'Meubels',1),(11,'Decoratie',1),(12,'Tuin',1),
 (20,'Boeken',2),(21,'Muziek',2),
 (30,'Klusjes',3),
 (40,'Autos',4),(41,'Fietsen',4);

INSERT INTO Categorie (ID, omschrijving, rubriekID) VALUES
 (100,'Stoelen',10),(101,'Tafels',10),(102,'Kasten',10),
 (110,'Schilderijen',11),(111,'Vazen',11),
 (120,'Tuinmeubels',12),(121,'Planten',12),
 (200,'Romans',20),(201,'Studieboeken',20),
 (210,'Vinyl',21),(211,'CD',21),
 (300,'Tuinonderhoud',30),(301,'Verhuis',30),
 (400,'Personenwagen',40),(410,'Stadsfiets',41),(411,'Koersfiets',41);

INSERT INTO Prijstype (ID, omschrijving) VALUES
 (1,'Vaste prijs'),(2,'Bieden'),(3,'Gratis'),(4,'Ruil');

INSERT INTO Meubelstijl (ID, stijl) VALUES
 (1,'Modern'),(2,'Vintage'),(3,'Industrieel'),(4,'Scandinavisch'),(5,'Klassiek');

INSERT INTO Vorm (ID, vorm) VALUES
 (1,'Rond'),(2,'Vierkant'),(3,'Rechthoekig'),(4,'Ovaal');

INSERT INTO Kleur (ID, kleur) VALUES
 (1,'Zwart'),(2,'Wit'),(3,'Bruin'),(4,'Grijs'),(5,'Blauw'),(6,'Rood'),(7,'Groen');

INSERT INTO Materiaal (ID, materiaal) VALUES
 (1,'Hout'),(2,'Metaal'),(3,'Glas'),(4,'Plastic'),(5,'Stof'),(6,'Leer');

INSERT INTO Gebruiker VALUES
 ('annvds','ann.vandersmissen@example.com','x','9000','Gent','0470111222',1,'2022-03-14',1,'V'),
 ('piet42','piet.peeters@example.com','x','2000','Antwerpen','0471222333',1,'2023-01-20',1,'M'),
 ('lucas','lucas.j@example.com','x','3000','Leuven',NULL,1,'2023-05-02',1,'M'),
 ('marieke','marieke.r@example.com','x','8500','Kortrijk','0473444555',1,'2021-11-11',1,'V'),
 ('joost','joost.b@example.com','x','9000','Gent','0474555666',1,'2024-02-01',0,'M'),
 ('sara','sara.k@example.com','x','1000','Brussel','0475666777',1,'2020-09-23',1,'V'),
 ('tom','tom.devries@example.com','x','3500','Hasselt',NULL,1,'2024-08-10',1,'M'),
 ('els','els.maes@example.com','x','2000','Antwerpen','0476777888',1,'2022-07-30',1,'V'),
 ('koen','koen.s@example.com','x','9000','Gent','0477888999',1,'2023-12-15',1,'M'),
 ('jana','jana.w@example.com','x','8000','Brugge','0478999000',1,'2024-01-05',1,'V');

INSERT INTO Zoekertje VALUES
 (1,'annvds',100,'Vintage houten stoel','Mooi gerestaureerd, kleine krasjes',1,45.00,1,30.00,1,1,'http://img/1.jpg',45,90,50,2,3),
 (2,'annvds',101,'Eikenhouten eettafel','Massief eik, 6 personen',1,320.00,0,NULL,1,0,'http://img/2.jpg',180,75,90,5,3),
 (3,'piet42',410,'Stadsfiets dame','Lichtjes gebruikt, alles werkt',1,180.00,1,140.00,1,0,'http://img/3.jpg',NULL,NULL,NULL,NULL,NULL),
 (4,'piet42',411,'Koersfiets Ridley','Carbon frame maat M',2,NULL,1,750.00,1,0,'http://img/4.jpg',NULL,NULL,NULL,NULL,NULL),
 (5,'lucas',200,'Stapel romans','10 boeken samen',1,15.00,0,NULL,1,1,NULL,NULL,NULL,NULL,NULL,NULL),
 (6,'lucas',201,'Cursus Databases','In nieuwstaat',1,25.00,0,NULL,1,1,NULL,NULL,NULL,NULL,NULL,NULL),
 (7,'marieke',110,'Aquarel landschap','Met kader',1,90.00,1,60.00,1,1,'http://img/7.jpg',60,40,3,NULL,3),
 (8,'marieke',111,'Glazen vaas','Hoog model, helder glas',3,NULL,0,NULL,1,1,'http://img/8.jpg',20,45,20,NULL,1),
 (9,'joost',300,'Gras maaien Gent','Per uur',1,18.00,0,NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL),
 (10,'sara',210,'Beatles LP collectie','5 LPs, goede staat',2,NULL,1,80.00,1,1,'http://img/10.jpg',NULL,NULL,NULL,NULL,NULL),
 (11,'sara',211,'Jazz CDs','20 cds',1,30.00,1,20.00,1,1,NULL,NULL,NULL,NULL,NULL,NULL),
 (12,'tom',102,'Industriele kast','Metaal + hout',1,250.00,1,200.00,1,0,'http://img/12.jpg',120,180,40,3,3),
 (13,'tom',100,'Scandi stoel set','4 stuks',1,160.00,0,NULL,1,1,'http://img/13.jpg',45,85,45,4,1),
 (14,'els',120,'Tuinbank teakhout','Voor 2 personen',1,140.00,1,100.00,1,0,'http://img/14.jpg',150,80,60,2,3),
 (15,'els',121,'Olijfboom','In pot, 1m20 hoog',2,NULL,1,40.00,1,0,NULL,NULL,NULL,NULL,NULL,NULL),
 (16,'koen',400,'VW Golf 2015','Goed onderhouden',1,7500.00,1,7000.00,1,0,'http://img/16.jpg',NULL,NULL,NULL,NULL,NULL),
 (17,'jana',301,'Verhuis hulp','Sterke handen + bestelwagen',1,35.00,0,NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL),
 (18,'jana',100,'Klassieke fauteuil','Stof, rode bekleding',1,80.00,1,50.00,1,0,'http://img/18.jpg',70,95,80,5,3),
 (19,'annvds',111,'Decoratieve vaas','Klein, vintage',3,NULL,0,NULL,1,1,NULL,15,30,15,2,1),
 (20,'piet42',101,'IKEA salontafel','Nog goed',3,NULL,0,NULL,1,0,NULL,80,40,80,1,2);

INSERT INTO Kleur_Zoekertje (kleurID, zoekertjeID) VALUES
 (3,1),(3,2),(2,7),(2,8),(1,12),(3,12),(2,13),(3,14),(7,15),(1,16),(6,18),(2,19),(2,20);

INSERT INTO Materiaal_Zoekertje (materiaalID, zoekertjeID) VALUES
 (1,1),(1,2),(2,3),(2,4),(1,12),(2,12),(1,13),(1,14),(3,8),(5,18),(3,19),(1,20),(4,20);

INSERT INTO Foto (ID, url, zoekertjeID) VALUES
 (1,'http://img/1.jpg',1),(2,'http://img/1b.jpg',1),
 (3,'http://img/2.jpg',2),
 (4,'http://img/3.jpg',3),
 (5,'http://img/7.jpg',7),(6,'http://img/7b.jpg',7),(7,'http://img/7c.jpg',7),
 (8,'http://img/12.jpg',12),
 (9,'http://img/13.jpg',13),(10,'http://img/13b.jpg',13),
 (11,'http://img/16.jpg',16),(12,'http://img/16b.jpg',16),(13,'http://img/16c.jpg',16),
 (14,'http://img/18.jpg',18);

INSERT INTO Bod (ID, bod, datum, zoekertjeID, gebruikersnaam) VALUES
 (1,32.00,'2024-09-01',1,'piet42'),
 (2,35.00,'2024-09-03',1,'lucas'),
 (3,40.00,'2024-09-05',1,'sara'),
 (4,150.00,'2024-09-10',3,'lucas'),
 (5,160.00,'2024-09-12',3,'tom'),
 (6,800.00,'2024-09-14',4,'koen'),
 (7,850.00,'2024-09-18',4,'tom'),
 (8,65.00,'2024-10-01',7,'jana'),
 (9,70.00,'2024-10-04',7,'piet42'),
 (10,85.00,'2024-10-06',10,'tom'),
 (11,100.00,'2024-10-08',10,'koen'),
 (12,210.00,'2024-10-10',12,'sara'),
 (13,7100.00,'2024-11-02',16,'lucas'),
 (14,55.00,'2024-11-05',18,'koen'),
 (15,45.00,'2024-11-06',15,'tom'),
 (16,22.00,'2024-11-07',11,'jana');
