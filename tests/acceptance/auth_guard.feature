Feature: Auth védelem mentésnél

  Scenario: Nem bejelentkezett user nem tud menteni
    Given a felhasználó nincs bejelentkezve
    When a felhasználó a /create-character oldalon van
    And minden kötelező mezőt helyesen kitölt
    And rákattint a "Save character" gombra
    Then egy "You are not logged in." alert jelenik meg
