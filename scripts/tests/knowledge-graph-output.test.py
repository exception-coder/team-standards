"""Validate the RDF exchange fixture and reject unsafe provenance/status changes.

Run with an isolated Python environment containing rdflib and pyshacl.
This checks exchange structure, not business truth or reviewer authorization.
"""

from pathlib import Path
import unittest

from pyshacl import validate
from rdflib import Graph, Literal, Namespace, RDF, URIRef
from rdflib.compare import isomorphic
from rdflib.namespace import DCTERMS, PROV


ASSETS = Path(__file__).resolve().parents[2] / (
    "plugins/team-standards/skills/business-ontology-modeling/assets/knowledge-graph"
)
KG = Namespace("urn:team-standards:knowledge:")
EX = Namespace("urn:example:discovery:")
STATEMENT = EX["statement-1"]
SOURCE = EX["source-v1"]


class KnowledgeGraphContractTest(unittest.TestCase):
    def setUp(self):
        self.graph = Graph().parse(ASSETS / "example.ttl", format="turtle")
        self.shapes = Graph().parse(ASSETS / "shapes.ttl", format="turtle")

    def assert_conforms(self, expected):
        conforms, _, report = validate(
            self.graph, shacl_graph=self.shapes, inference="none", meta_shacl=True
        )
        self.assertEqual(expected, conforms, report)

    def test_candidate_is_valid_without_asserting_the_business_fact(self):
        self.assert_conforms(True)
        self.assertNotIn((EX["order-sample"], EX.submittedBy, EX["customer-sample"]), self.graph)

    def test_missing_evidence_is_rejected(self):
        self.graph.remove((STATEMENT, PROV.wasDerivedFrom, None))
        self.assert_conforms(False)

    def test_unresolved_evidence_is_rejected(self):
        self.graph.set((STATEMENT, PROV.wasDerivedFrom, EX["missing-source"]))
        self.assert_conforms(False)

    def test_missing_source_revision_is_rejected(self):
        self.graph.remove((SOURCE, DCTERMS.identifier, None))
        self.assert_conforms(False)

    def test_acceptance_without_review_is_rejected(self):
        self.graph.set((STATEMENT, KG.status, Literal("accepted")))
        self.assert_conforms(False)

    def test_acceptance_requires_structured_review_and_keeps_inference_basis(self):
        self.graph.set((STATEMENT, KG.status, Literal("accepted")))
        self.graph.add((STATEMENT, KG.review, EX.review))
        self.graph.add((EX.review, RDF.type, PROV.Entity))
        self.graph.add((EX.review, DCTERMS.source, URIRef("urn:example:review-record")))
        self.graph.add((EX.review, DCTERMS.identifier, Literal("synthetic-review-v1")))
        self.graph.add((EX.review, PROV.wasAttributedTo, EX.reviewer))
        self.graph.add((EX.reviewer, RDF.type, PROV.Agent))
        self.assert_conforms(True)
        self.assertEqual(Literal("inferred"), self.graph.value(STATEMENT, KG.basis))
        self.graph.remove((EX.review, PROV.wasAttributedTo, None))
        self.assert_conforms(False)

    def test_unknown_status_and_multiple_objects_are_rejected(self):
        self.graph.set((STATEMENT, KG.status, Literal("high-confidence")))
        self.assert_conforms(False)
        self.graph.set((STATEMENT, KG.status, Literal("candidate")))
        self.graph.add((STATEMENT, RDF.object, EX["another-customer"]))
        self.assert_conforms(False)

    def test_turtle_roundtrip_preserves_identity_and_provenance(self):
        restored = Graph().parse(data=self.graph.serialize(format="turtle"), format="turtle")
        self.assertTrue(isomorphic(self.graph, restored))

    def test_formal_query_excludes_candidates_and_withdrawn_statements(self):
        query = """
            PREFIX kg: <urn:team-standards:knowledge:>
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            SELECT ?s ?p ?o WHERE {
                ?claim a rdf:Statement; kg:status "accepted";
                    rdf:subject ?s; rdf:predicate ?p; rdf:object ?o .
            }
        """
        self.assertEqual(0, len(list(self.graph.query(query))))
        # Projection filtering is independent of validation; this is not a publish operation.
        self.graph.set((STATEMENT, KG.status, Literal("accepted")))
        self.assertEqual(1, len(list(self.graph.query(query))))
        self.graph.set((STATEMENT, KG.status, Literal("deprecated")))
        self.assertEqual(0, len(list(self.graph.query(query))))
        self.assertIn((STATEMENT, PROV.wasDerivedFrom, SOURCE), self.graph)


if __name__ == "__main__":
    unittest.main()
