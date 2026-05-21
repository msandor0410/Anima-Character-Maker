Feature: Karakterlista üres állapota (Dashboard)

  Scenario: Üres állapot megjelenítése
    Given a teszt felhasználó be van jelentkezve
    And a felhasználónak nincs karaktere
    When megnyitja a dashboard oldalt
    Then megjelenik a "No characters yet. Create your first one." üzenet
    And látható a "New Character" gomb
