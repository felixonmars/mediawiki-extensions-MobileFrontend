@chrome @en.m.wikipedia.beta.wmflabs.org @en.m.wikipedia.org @firefox @login @test2.m.wikipedia.org
Feature: Wikitext Editor (TEST RUN ON WIKIPEDIA.ORG SO SHOULD NOT CAUSE SAVES)

  Background:
    Given I am logged into the mobile website
      And I am on the "Nonexistent_page_ijewrcmhvg34773" page
    When I click the edit button

  Scenario: Opening editor
    Then I see the wikitext editor

  Scenario: Closing editor (overlay button)
    When I click the editor overlay close button
    Then I should not see the editor overlay
      And The URL of the page should contain "Nonexistent_page_ijewrcmhvg34773"

  Scenario: Closing editor (browser button)
    When I click the browser back button
    Then I should not see the editor overlay
      And The URL of the page should contain "Nonexistent_page_ijewrcmhvg34773"