Feature: Érvényes karakter létrehozása (Firestore)

  Scenario: Sikeres karaktermentés
    Given a teszt felhasználó be van jelentkezve
    When a felhasználó a /create-character oldalon van
    And minden kötelező mezőt helyesen kitölt
    And rákattint a "Save character" gombra
    Then a rendszer elmenti a karaktert Firestore-ba a users/<uid>/characters alá
    And az új karakter megjelenik a listában
