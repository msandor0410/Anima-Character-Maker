Feature: Validáció hibás bevitel esetén

  Scenario: Üres név mező esetén nincs mentés
    Given a teszt felhasználó be van jelentkezve
    When a felhasználó a /create-character oldalon van
    And üresen hagyja a "name" mezőt
    And rákattint a "Save character" gombra
    Then egy "Name is required." alert jelenik meg
    And nem történik Firestore mentés
