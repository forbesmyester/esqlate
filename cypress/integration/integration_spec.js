import chaiColors from 'chai-colors'
chai.use(chaiColors)

function goTo(cy, isFirst, definitionTitle) {

    if (isFirst) {
        cy.visit("http://localhost:8800/");
        cy.get(".showing-menu #logo")
            .contains("eSQLate");
    } else
    {
        cy.get('.off-canvas-toggle').click();
    }

    cy.get(".off-canvas-sidebar.active #menu")
        .contains(definitionTitle)
        .click();
}

describe('Ensure table structures', function() {

    it('Delete', function() {

        goTo(cy, true, "Drop Table");

        cy.get(".code-popup .modal-footer .btn-primary").click();

        cy.get('#out-popup-results a[href="#show-downloads"]')
            .contains("download the results");

        cy.get('#out-popup-results a[href="#show-downloads"]')
            .contains("download the results");

    });

    it('Create', function() {

        goTo(cy, false, "Create Table");

        cy.get(".code-popup .modal-footer .btn-primary").click();

        cy.get('#out-popup-results a[href="#show-downloads"]')
            .contains("download the results");

    });

})


describe('Allow Nulls', function () {
    it('Adds some data', function () {
        goTo(cy, true, "Allow Nulls");

        cy.get(`.code-code [data-parameter-name="name"]`)
            .type("J Manager");

        cy.get(".code-popup .modal-footer .btn-primary").click();
    });
    it('Check added Manager', function () {
        goTo(cy, true, "List");
        cy.get(".code-popup .modal-footer .btn-primary").click();
        cy.get(`table td`)
            .contains("J Manager");
    });
});

describe('Highlighting Nulls and insert', function () {

    it('Highlighting nulls', function() {

        goTo(cy, true, "No Nulls");

        for (const fieldName of ["managed_by", "birthday", "age"]) {
            cy.get(`.code-code .field_highlight[data-field="${fieldName}"]`)
                .should("have.css", "color")
                .and("be.colored", "rgb(171, 70, 66)");
            cy.get(`.code-code [data-parameter-name="${fieldName}"]`)
                .should("have.css", "border-color")
                .and("be.colored", "rgb(171, 70, 66)");
        }

        cy.get('#toast-error-wrapper').should('not.be.visible');

        cy.get(".code-popup .modal-footer .btn-primary").click();
        cy.get('#toast-error-wrapper').should('be.visible');
        cy.get('#toast-error-wrapper .toast-error button').click();
        cy.get('#toast-error-wrapper').should('not.be.visible');

    });

    it('Can add data when not allowing nulls', function () {

        cy.get('#toast-error-wrapper').should('not.be.visible');

        cy.get(`.code-code [data-parameter-name="age"]`)
            .type("22");

        cy.get(`.code-code [data-parameter-name="name"]`)
            .type("J Junior");

        cy.get('#toast-error-wrapper').should('not.be.visible');

        cy.get(`.code-code [data-parameter-name="managed_by"]`).click();

        cy.get(".code-popup .modal-footer .btn-primary").click();

        // cy.wait(1000);
        cy.get(`table td button`)
            .contains("Pick")
            .click()

        cy.get(`.code-code [data-parameter-name="birthday"]`)
            .type("1985-05-05");

        cy.get('#toast-error-wrapper').should('not.be.visible');
        cy.get(".code-popup .modal-footer .btn-primary").click();
        cy.get('#toast-error-wrapper').should('not.be.visible');
        cy.get('#out-popup-results a[href="#show-downloads"]')
            .contains("download the results");

    });

    it('Check added Junior', function () {
        goTo(cy, true, "List");
        cy.get(".code-popup .modal-footer .btn-primary").click();
        cy.get(`table td`)
            .contains("J Manager");
        cy.get(`table td`)
            .contains("J Junior");
    });
})
